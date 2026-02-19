import { z } from "zod";

import type { AIProvider } from "./provider";
import { estimateCost } from "./usage";

const ToolPickSchema = z.object({
  tool: z.string(),
  args: z.record(z.any()).default({}),
});

type ToolPick = z.infer<typeof ToolPickSchema>;

const PickSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("tool"),
    tool: z.string(),
    args: z.record(z.any()).default({}),
    note: z.string().optional(),
  }),
  z.object({
    action: z.literal("done"),
    finalAnswer: z.string().min(1),
  }),
]);
type ChainPick = z.infer<typeof PickSchema>;

export type ToolExecutionResult = {
  result: Record<string, unknown>;
  durationMs: number;
};

export type ToolExecutionStep = {
  step: number;
  pick: {
    action: "tool" | "done";
    tool?: string;
    args?: Record<string, unknown>;
    note?: string;
    finalAnswer?: string;
  };
  tool?: {
    name: string;
    args: Record<string, unknown>;
    result?: Record<string, unknown>;
    error?: string;
    durationMs?: number;
  };
  assistant?: { note?: string; partialAnswer?: string };
  usage?: { inputTokens: number; outputTokens: number };
  costUsd?: number;
};

export async function runSingleToolWorkflow(params: {
  provider: AIProvider;
  model: string;
  systemPrompt: string;
  prompt: string;
  userId: string;
  orgId: string;
  tools: Array<{ name: string; description: string }>;
  executeTool: (args: {
    tool: string;
    args: Record<string, unknown>;
    userId: string;
    orgId: string;
  }) => Promise<ToolExecutionResult>;
  transformResult?: (result: Record<string, unknown>) => Record<string, unknown>;
  maxResultChars?: number;
}) {
  const messages = [
    { role: "system" as const, content: params.systemPrompt },
    {
      role: "system" as const,
      content:
        `You can call ONE tool. Choose the best tool from this list:\n` +
        params.tools.map((t) => `- ${t.name}: ${t.description}`).join("\n") +
        `\nReturn JSON: {\"tool\": \"...\", \"args\": {...}}`,
    },
    { role: "user" as const, content: params.prompt },
  ];

  const pick = await params.provider.generateStructured<typeof ToolPickSchema, ToolPick>({
    messages,
    model: params.model,
    temperature: 0,
    schema: ToolPickSchema,
    userId: params.userId,
    orgId: params.orgId,
  });

  const exec = await params.executeTool({
    tool: pick.data.tool,
    args: pick.data.args,
    userId: params.userId,
    orgId: params.orgId,
  });

  const transformed = params.transformResult
    ? params.transformResult(exec.result)
    : exec.result;
  const resultJson = JSON.stringify(transformed);
  if (resultJson.length > (params.maxResultChars ?? 20_000)) {
    throw new Error("Tool result too large");
  }

  const explain = await params.provider.generate({
    model: params.model,
    temperature: 0.2,
    userId: params.userId,
    orgId: params.orgId,
    messages: [
      { role: "system", content: params.systemPrompt },
      { role: "user", content: `User asked: ${params.prompt}` },
      {
        role: "user",
        content: `Tool used: ${pick.data.tool}\nTool result JSON:\n${JSON.stringify(transformed)}`,
      },
      {
        role: "user",
        content: "Explain the result concisely and suggest next actions.",
      },
    ],
  });

  const inputTokens = pick.usage.inputTokens + explain.usage.inputTokens;
  const outputTokens = pick.usage.outputTokens + explain.usage.outputTokens;
  const costUsd = estimateCost(params.model, inputTokens, outputTokens);

  return {
    tool: pick.data.tool,
    args: pick.data.args,
    result: transformed,
    answer: explain.text,
    usage: { inputTokens, outputTokens },
    costUsd,
    messageCount: messages.length,
    promptChars: messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0),
    execution: {
      step: 1,
      toolName: pick.data.tool,
      durationMs: exec.durationMs,
      status: "ok" as const,
      errorMessage: null,
    },
  };
}

export async function runToolChainWorkflow(params: {
  provider: AIProvider;
  model: string;
  systemPrompt: string;
  prompt: string;
  maxSteps: number;
  userId: string;
  orgId: string;
  tools: Array<{ name: string; description: string }>;
  executeTool: (args: {
    tool: string;
    args: Record<string, unknown>;
    userId: string;
    orgId: string;
  }) => Promise<ToolExecutionResult>;
  transformResult?: (result: Record<string, unknown>) => Record<string, unknown>;
}) {
  const steps: ToolExecutionStep[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const memory: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [
    { role: "system", content: params.systemPrompt },
    {
      role: "system",
      content:
        `You may call tools up to ${params.maxSteps} times. ` +
        `Available tools:\n` +
        params.tools.map((t) => `- ${t.name}: ${t.description}`).join("\n") +
        `\nRules:\n- Always pick the best next tool or finish with action=\"done\".\n- If tool: return JSON {\"action\":\"tool\",\"tool\":\"...\",\"args\":{...},\"note\":\"...\"}\n- If done: return JSON {\"action\":\"done\",\"finalAnswer\":\"...\"}\n- One action per step.\n`,
    },
    { role: "user", content: params.prompt },
  ];

  for (let i = 1; i <= params.maxSteps; i++) {
    const pickOut = await params.provider.generateStructured<
      typeof PickSchema,
      ChainPick
    >({
      messages: memory,
      model: params.model,
      temperature: 0,
      schema: PickSchema,
      userId: params.userId,
      orgId: params.orgId,
    });

    totalInputTokens += pickOut.usage.inputTokens;
    totalOutputTokens += pickOut.usage.outputTokens;

    const pick = pickOut.data;
    const step: ToolExecutionStep = {
      step: i,
      pick,
      usage: pickOut.usage,
      costUsd: estimateCost(
        params.model,
        pickOut.usage.inputTokens,
        pickOut.usage.outputTokens,
      ),
    };

    if (pick.action === "done") {
      step.assistant = { partialAnswer: pick.finalAnswer };
      steps.push(step);
      break;
    }

    let toolResult: Record<string, unknown> | null = null;
    let toolError: string | null = null;
    let toolDurationMs = 0;

    try {
      const exec = await params.executeTool({
        tool: pick.tool,
        args: pick.args,
        userId: params.userId,
        orgId: params.orgId,
      });
      toolResult = params.transformResult ? params.transformResult(exec.result) : exec.result;
      toolDurationMs = exec.durationMs;
    } catch (error) {
      toolError = error instanceof Error ? error.message : "Tool execution failed";
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

    memory.push({
      role: "assistant",
      content: `Tool call: ${pick.tool}\nArgs: ${JSON.stringify(pick.args)}\nResult: ${JSON.stringify(toolResult ?? { error: toolError })}`,
    });

    if (toolError) {
      memory.push({
        role: "assistant",
        content:
          'The tool failed. On next step, either choose another tool or finish with action="done" and explain.',
      });
    }
  }

  const last = steps[steps.length - 1];
  const hasDone = last?.pick?.action === "done";

  let finalAnswer = "";
  if (!hasDone) {
    const finalOut = await params.provider.generate({
      model: params.model,
      temperature: 0.2,
      userId: params.userId,
      orgId: params.orgId,
      messages: [
        ...memory,
        {
          role: "user",
          content: "Finish now. Summarize what you did and give the final answer.",
        },
      ],
    });

    totalInputTokens += finalOut.usage.inputTokens;
    totalOutputTokens += finalOut.usage.outputTokens;
    finalAnswer = finalOut.text;
  } else {
    finalAnswer =
      (last?.pick.action === "done" ? last.pick.finalAnswer : undefined) ??
      last?.assistant?.partialAnswer ??
      "";
  }

  const costUsd = estimateCost(params.model, totalInputTokens, totalOutputTokens);

  return {
    steps,
    finalAnswer,
    usage: {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    },
    costUsd,
    messageCount: memory.length,
    promptChars: params.prompt.length,
    executions: steps
      .filter((s) => s.tool?.name)
      .map((s) => ({
        step: s.step,
        toolName: s.tool!.name,
        durationMs: Math.max(0, Math.round(s.tool?.durationMs ?? 0)),
        status: s.tool?.error ? ("error" as const) : ("ok" as const),
        errorMessage: s.tool?.error ?? null,
      })),
  };
}
