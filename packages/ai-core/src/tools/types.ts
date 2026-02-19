import type { ZodTypeAny } from "zod";

export type ToolResult = Record<string, unknown>;

export interface ToolContext {
  userId: string;
  orgId: string;
  permissions?: string[];
}

export type ToolAuthorizeFn = (ctx: ToolContext, args: unknown) => Promise<boolean> | boolean;

export interface AITool<TSchema extends ZodTypeAny = ZodTypeAny> {
  name: string;
  description: string;
  schema: TSchema;
  timeoutMs?: number;
  retries?: number;
  authorize?: ToolAuthorizeFn;
  execute(args: unknown, ctx: ToolContext): Promise<ToolResult>;
}
