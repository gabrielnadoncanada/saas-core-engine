import {
  OpenAIProvider,
  executeToolWithContract,
  runToolChainWorkflow,
} from "@ai-core";
import { prisma } from "@db";
import { z } from "zod";

import {
  createAIEnforcementService,
  createAIPromptsService,
} from "@/server/adapters/core/ai-core.adapter";
import { DEFAULT_PROMPTS } from "@/server/ai/prompts/default-prompts";
import { buildToolRegistry } from "@/server/ai/tools";
import { redact, clampJsonSize } from "@/server/ai/tools/telemetry";
import { getSessionUser } from "@/server/auth/require-user";
import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import { env } from "@/server/config/env";

const BodySchema = z.object({
  prompt: z.string().min(3),
  maxSteps: z.number().int().min(1).max(3).default(3),
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

  let policy: { plan: string; model: string };
  try {
    const p = await createAIEnforcementService().enforceAiOrThrow(
      user.organizationId,
    );
    policy = { plan: p.plan, model: p.model };
  } catch (e) {
    const status = (e as any).status ?? 429;
    const meta = (e as any).meta ?? null;

    await prisma.aIAuditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        model: "blocked",
        plan: meta?.plan ?? "unknown",
        route: "/api/ai/tools/chain",
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

  const provider = new OpenAIProvider(env.OPENAI_API_KEY);
  const model = policy.model;

  const systemPrompt = await createAIPromptsService().getActivePromptContent(
    user.organizationId,
    "chat.system",
    DEFAULT_PROMPTS["chat.system"],
  );

  const registry = buildToolRegistry();
  const tools = registry.list();

  try {
    const out = await runToolChainWorkflow({
      provider,
      model,
      systemPrompt,
      prompt: body.data.prompt,
      maxSteps: body.data.maxSteps,
      userId: user.id,
      orgId: user.organizationId,
      tools,
      executeTool: async ({ tool, args, userId, orgId }) =>
        executeToolWithContract(registry, tool, args, { userId, orgId }),
      transformResult: (result) =>
        clampJsonSize(redact(result)) as Record<string, unknown>,
    });

    // Persist usage + audit
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
        route: "/api/ai/tools/chain",
        promptChars: out.promptChars,
        messageCount: out.messageCount,
        inputTokens: out.usage.inputTokens,
        outputTokens: out.usage.outputTokens,
        costUsd: out.costUsd,
        status: "ok",
      },
      select: { id: true },
    });

    const execRows = out.executions.map((s) => ({
        auditLogId: audit.id,
        step: s.step,
        toolName: s.toolName,
        durationMs: s.durationMs,
        status: s.status,
        errorMessage: s.errorMessage,
      }));

    if (execRows.length) {
      await prisma.aIToolExecution.createMany({ data: execRows });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        plan: policy.plan,
        model,
        prompt: body.data.prompt,
        maxSteps: body.data.maxSteps,
        steps: out.steps,
        finalAnswer: out.finalAnswer,
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
        route: "/api/ai/tools/chain",
        promptChars: body.data.prompt.length,
        messageCount: 1,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        status: "error",
        errorCode: "provider",
        errorMessage: "Tool chaining failed",
      },
    });

    return new Response(
      JSON.stringify({ ok: false, error: "Tool chaining failed" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
}
