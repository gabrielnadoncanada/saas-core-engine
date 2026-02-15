import { z } from "zod";
import { OpenAIProvider, estimateCost } from "@ai-core";
import { prisma } from "@db";

import { getSessionUser } from "@/shared/getSessionUser";
import { env } from "@/server/config/env";
import { enforceAiOrThrow } from "@/server/ai/ai-enforcement";
import { buildToolRegistry } from "@/server/ai/tools";
import { executeTool } from "@ai-core";

import { DEFAULT_PROMPTS } from "@/server/ai/prompts/default-prompts";
import { getActivePromptContent } from "@/server/ai/prompts/ai-prompts.service";
import { getRequestMeta } from "@/server/ai/ai-audit";
import {
  time,
  withTimeout,
  redact,
  clampJsonSize,
} from "@/server/ai/tools/telemetry";

const BodySchema = z.object({
  prompt: z.string().min(3),
});

const ToolPickSchema = z.object({
  tool: z.string(),
  args: z.record(z.any()).default({}),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const raw = await req.json().catch(() => null);
  const body = BodySchema.safeParse(raw);
  if (!body.success) return new Response("Invalid body", { status: 400 });

  // enforcement
  let policy: {
    plan: string;
    model: string;
    quota: number;
    used: number;
    rpm: number;
    rpmCount: number;
    rpmWindowStart: string;
  };
  try {
    policy = await enforceAiOrThrow(user.organizationId);
  } catch (e) {
    const status = (e as any).status ?? 429;
    const meta = (e as any).meta ?? null;

    await prisma.aIAuditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        model: "blocked",
        plan: meta?.plan ?? "unknown",
        route: "/api/ai/tools",
        promptChars: body.data.prompt.length,
        messageCount: 1,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        status: "blocked",
        errorCode: status === 402 ? "quota" : "rpm",
        errorMessage: (e as Error).message,
      },
    });

    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message, meta }),
      {
        status,
        headers: { "content-type": "application/json" },
      },
    );
  }

  const model = policy.model;
  const provider = new OpenAIProvider(env.OPENAI_API_KEY);

  const systemPrompt = await getActivePromptContent(
    user.organizationId,
    "chat.system",
    DEFAULT_PROMPTS["chat.system"],
  );

  const registry = buildToolRegistry();
  const tools = registry.list();

  // Step 1: Ask model to pick a tool + args (structured)
  const pickMessages = [
    { role: "system" as const, content: systemPrompt },
    {
      role: "system" as const,
      content:
        `You can call ONE tool. Choose the best tool from this list:\n` +
        tools.map((t) => `- ${t.name}: ${t.description}`).join("\n") +
        `\nReturn JSON: {"tool": "...", "args": {...}}`,
    },
    { role: "user" as const, content: body.data.prompt },
  ];

  const { messageCount, promptChars } = getRequestMeta(pickMessages);

  try {
    const pick = await provider.generateStructured({
      messages: pickMessages,
      model,
      temperature: 0,
      schema: ToolPickSchema,
      userId: user.id,
      orgId: user.organizationId,
    });

    // Step 2: Execute the tool
    const exec = await time(async () => {
      const res = await withTimeout(
        executeTool(registry, pick.data.tool, pick.data.args, {
          userId: user.id,
          orgId: user.organizationId,
        }),
        2000,
      );
      return clampJsonSize(redact(res));
    });

    const result = exec.error ? null : exec.value;

    const toolError = exec.error;

    const resultJson = JSON.stringify(result);
    if (resultJson.length > 20_000) {
      throw new Error("Tool result too large");
    }

    // Step 3: Ask model to explain result (normal generate)
    const explain = await provider.generate({
      model,
      temperature: 0.2,
      userId: user.id,
      orgId: user.organizationId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `User asked: ${body.data.prompt}` },
        {
          role: "user",
          content: `Tool used: ${pick.data.tool}\nTool result JSON:\n${JSON.stringify(result)}`,
        },
        {
          role: "user",
          content: `Explain the result concisely and suggest next actions.`,
        },
      ],
    });

    // Usage tracking: add both calls
    const inputTokens = pick.usage.inputTokens + explain.usage.inputTokens;
    const outputTokens = pick.usage.outputTokens + explain.usage.outputTokens;
    const cost = estimateCost(model, inputTokens, outputTokens);

    await prisma.aIUsage.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        model,
        inputTokens,
        outputTokens,
        costUsd: cost,
      },
    });

    const audit = await prisma.aIAuditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        model,
        plan: policy.plan,
        route: "/api/ai/tools",
        promptChars,
        messageCount,
        inputTokens,
        outputTokens,
        costUsd: cost,
        status: toolError ? "error" : "ok",
        errorCode: toolError ? "tool" : null,
        errorMessage: toolError ? toolError : null,
      },
      select: { id: true },
    });

    await prisma.aIToolExecution.create({
      data: {
        auditLogId: audit.id,
        step: 1,
        toolName: pick.data.tool,
        durationMs: exec.durationMs,
        status: toolError ? "error" : "ok",
        errorMessage: toolError,
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        plan: policy.plan,
        model,
        tool: pick.data.tool,
        args: pick.data.args,
        result,
        answer: explain.text,
        usage: { inputTokens, outputTokens },
        costUsd: cost,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch (e) {
    await prisma.aIAuditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        model,
        plan: policy.plan,
        route: "/api/ai/tools",
        promptChars,
        messageCount,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        status: "error",
        errorCode: "provider",
        errorMessage: "Tool execution failed",
      },
    });

    return new Response(
      JSON.stringify({ ok: false, error: "Tool execution failed" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
}
