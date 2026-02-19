import type { ToolContext } from "./types";
import type { ToolRegistry } from "./registry";

export type ExecuteToolResult = {
  result: Record<string, unknown>;
  attempts: number;
  durationMs: number;
};

function timeoutError(name: string, timeoutMs: number): Error {
  return new Error(`Tool ${name} timed out after ${timeoutMs}ms`);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, name: string): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(timeoutError(name, timeoutMs)), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function executeToolWithContract(
  registry: ToolRegistry,
  name: string,
  args: unknown,
  ctx: ToolContext,
): Promise<ExecuteToolResult> {
  const tool = registry.get(name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);

  const parsed = tool.schema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid tool args for ${name}`);
  }

  if (tool.authorize) {
    const allowed = await tool.authorize(ctx, parsed.data);
    if (!allowed) throw new Error(`Unauthorized tool call: ${name}`);
  }

  const retries = Math.max(0, tool.retries ?? 0);
  const timeoutMs = Math.max(0, tool.timeoutMs ?? 0);
  const startedAt = Date.now();

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const result = await withTimeout(
        Promise.resolve(tool.execute(parsed.data, ctx)),
        timeoutMs,
        name,
      );

      return {
        result,
        attempts: attempt,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      lastError = error;
      if (attempt > retries) break;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Tool execution failed: ${name}`);
}

export async function executeTool(
  registry: ToolRegistry,
  name: string,
  args: unknown,
  ctx: ToolContext,
) {
  const out = await executeToolWithContract(registry, name, args, ctx);
  return out.result;
}
