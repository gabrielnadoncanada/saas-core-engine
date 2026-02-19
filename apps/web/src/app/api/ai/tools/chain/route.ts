import { z } from "zod";
import { OpenAIProvider, estimateCost } from "@ai-core";
import { prisma } from "@db";

import { getSessionUser } from "@/server/auth/require-user";
import { env } from "@/server/config/env";
import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import {
  createAIEnforcementService,
  createAIPromptsService,
} from "@/server/adapters/core/ai-core.adapter";

import { DEFAULT_PROMPTS } from "@/server/ai/prompts/default-prompts";

import { buildToolRegistry } from "@/server/ai/tools";
import { executeToolWithContract } from "@ai-core";
import {
  redact,
  clampJsonSize,
} from "@/server/ai/tools/telemetry";

const BodySchema = z.object({
  prompt: z.string().min(3),
  maxSteps: z.number().int().min(1).max(3).default(3),
});

const PickSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("tool"),
    tool: z.string(),
    args: z.record(z.any()).default({}),
    note: z.string().optional(), // short rationale
  }),
  z.object({
    action: z.literal("done"),
    finalAnswer: z.string().min(1),
  }),
]);

type Step = {
  step: number;
  pick: any;
  tool?: { name: string; args: any; result?: any; error?: string; durationMs?: number };
  assistant?: { note?: string; partialAnswer?: string };
  usage?: { inputTokens: number; outputTokens: number };
  costUsd?: number;
};

function clampResultSize(obj: unknown) {
  const s = JSON.stringify(obj);
  if (s.length > 20_000) throw new Error("Tool result too large");
  return obj;
}

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

  const steps: Step[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Working memory that model sees
  const memory: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [
    { role: "system", content: systemPrompt },
    {
      role: "system",
      content:
        `You may call tools up to ${body.data.maxSteps} times. ` +
        `Available tools:\n` +
        tools.map((t) => `- ${t.name}: ${t.description}`).join("\n") +
        `\nRules:\n- Always pick the best next tool or finish with action="done".\n- If tool: return JSON {"action":"tool","tool":"...","args":{...},"note":"..."}\n- If done: return JSON {"action":"done","finalAnswer":"..."}\n- One action per step.\n`,
    },
    { role: "user", content: body.data.prompt },
  ];

  try {
    for (let i = 1; i <= body.data.maxSteps; i++) {
      // Ask model: what next? (structured)
      const pickOut = await provider.generateStructured({
        messages: memory,
        model,
        temperature: 0,
        schema: PickSchema,
        userId: user.id,
        orgId: user.organizationId,
      });

      totalInputTokens += pickOut.usage.inputTokens;
      totalOutputTokens += pickOut.usage.outputTokens;

      const pick = pickOut.data as any;
      const step: Step = {
        step: i,
        pick,
        usage: pickOut.usage,
        costUsd: estimateCost(
          model,
          pickOut.usage.inputTokens,
          pickOut.usage.outputTokens,
        ),
      };

      if (pick.action === "done") {
        step.assistant = { partialAnswer: pick.finalAnswer };
        steps.push(step);
        break;
      }

      // Execute tool
      let toolResult: any = null;
      let toolError: string | null = null;
      let toolDurationMs = 0;

      try {
        const exec = await executeToolWithContract(
          registry,
          pick.tool,
          pick.args,
          {
            userId: user.id,
            orgId: user.organizationId,
          },
        );
        toolResult = clampJsonSize(redact(exec.result));
        toolError = null;
        toolDurationMs = exec.durationMs;
      } catch (e) {
        toolError = (e as Error).message;
      }

      step.tool = {
        name: pick.tool,
        args: pick.args,
        result: toolResult ?? undefined,
        error: toolError ?? undefined,
        durationMs: toolDurationMs,
      };
      step.assistant = { note: pick.note ?? "" };
      steps.push(step);

      // Feed result back into memory for the next iteration
      memory.push({
        role: "assistant",
        content: `Tool call: ${pick.tool}\nArgs: ${JSON.stringify(pick.args)}\nResult: ${JSON.stringify(toolResult ?? { error: toolError })}`,
      });

      // If tool failed badly, ask model to finish next step with explanation (but keep loop simple)
      if (toolError) {
        memory.push({
          role: "assistant",
          content: `The tool failed. On next step, either choose another tool or finish with action="done" and explain.`,
        });
      }
    }

    // If no done step, ask finalization (doesn't count as tool step)
    const last = steps[steps.length - 1];
    const hasDone = last?.pick?.action === "done";

    let finalAnswer = "";
    let finalizeUsage = { inputTokens: 0, outputTokens: 0 };

    if (!hasDone) {
      const finalOut = await provider.generate({
        model,
        temperature: 0.2,
        userId: user.id,
        orgId: user.organizationId,
        messages: [
          ...memory,
          {
            role: "user",
            content:
              "Finish now. Summarize what you did and give the final answer.",
          },
        ],
      });

      finalizeUsage = finalOut.usage;
      totalInputTokens += finalOut.usage.inputTokens;
      totalOutputTokens += finalOut.usage.outputTokens;
      finalAnswer = finalOut.text;
    } else {
      finalAnswer =
        (last as any).pick.finalAnswer ??
        (last as any).assistant?.partialAnswer ??
        "";
    }

    const totalCost = estimateCost(model, totalInputTokens, totalOutputTokens);

    // Persist usage + audit
    await prisma.aIUsage.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        model,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        costUsd: totalCost,
      },
    });

    const audit = await prisma.aIAuditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        model,
        plan: policy.plan,
        route: "/api/ai/tools/chain",
        promptChars: body.data.prompt.length,
        messageCount: memory.length,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        costUsd: totalCost,
        status: "ok",
      },
      select: { id: true },
    });

    const execRows = steps
      .filter((s) => s.tool?.name)
      .map((s) => ({
        auditLogId: audit.id,
        step: s.step,
        toolName: s.tool!.name,
        durationMs: Math.max(0, Math.round(s.tool?.durationMs ?? 0)),
        status: s.tool?.error ? "error" : "ok",
        errorMessage: s.tool?.error ?? null,
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
        steps,
        finalAnswer,
        usage: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
        },
        costUsd: totalCost,
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
