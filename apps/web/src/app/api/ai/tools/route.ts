import {
  OpenAIProvider,
  runSingleToolWorkflow,
  executeToolWithContract,
} from "@ai-core";
import { prisma } from "@db";
import { z } from "zod";

import {
  createAIEnforcementService,
  createAIPromptsService,
} from "@/server/adapters/core/ai-core.adapter";
import { DEFAULT_PROMPTS } from "@/server/ai/prompts/default-prompts";
import { buildToolRegistry } from "@/server/ai/tools";
import {
  redact,
  clampJsonSize,
} from "@/server/ai/tools/telemetry";
import { getSessionUser } from "@/server/auth/require-user";
import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import { env } from "@/server/config/env";

const BodySchema = z.object({
  prompt: z.string().min(3),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  try {
    await withRequiredOrgScope({
      organizationId: user.organizationId,
      action: "ai:tools:execute",
      run: async () => undefined,
    });
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

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
    policy = await createAIEnforcementService().enforceAiOrThrow(
      user.organizationId,
    );
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

  const systemPrompt = await createAIPromptsService().getActivePromptContent(
    user.organizationId,
    "chat.system",
    DEFAULT_PROMPTS["chat.system"],
  );

  const registry = buildToolRegistry();
  const tools = registry.list();
  const promptChars = body.data.prompt.length;
  const messageCount = 3;

  try {
    const out = await runSingleToolWorkflow({
      provider,
      model,
      systemPrompt,
      prompt: body.data.prompt,
      userId: user.id,
      orgId: user.organizationId,
      tools,
      executeTool: async ({ tool, args, userId, orgId }) =>
        executeToolWithContract(registry, tool, args, { userId, orgId }),
      transformResult: (result) =>
        clampJsonSize(redact(result)) as Record<string, unknown>,
      maxResultChars: 20_000,
    });

    await prisma.aIUsage.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        model,
        inputTokens: out.usage.inputTokens,
        outputTokens: out.usage.outputTokens,
        costUsd: out.costUsd,
      },
    });

    const audit = await prisma.aIAuditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        model,
        plan: policy.plan,
        route: "/api/ai/tools",
        promptChars: out.promptChars,
        messageCount: out.messageCount,
        inputTokens: out.usage.inputTokens,
        outputTokens: out.usage.outputTokens,
        costUsd: out.costUsd,
        status: "ok",
        errorCode: null,
        errorMessage: null,
      },
      select: { id: true },
    });

    await prisma.aIToolExecution.create({
      data: {
        auditLogId: audit.id,
        step: out.execution.step,
        toolName: out.execution.toolName,
        durationMs: out.execution.durationMs,
        status: out.execution.status,
        errorMessage: out.execution.errorMessage,
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        plan: policy.plan,
        model,
        tool: out.tool,
        args: out.args,
        result: out.result,
        answer: out.answer,
        usage: out.usage,
        costUsd: out.costUsd,
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
