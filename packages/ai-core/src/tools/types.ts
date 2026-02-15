import type { ZodTypeAny } from "zod";

export type ToolResult = Record<string, unknown>;

export interface ToolContext {
  userId: string;
  orgId: string;
}

export interface AITool<TSchema extends ZodTypeAny = ZodTypeAny> {
  name: string;
  description: string;
  schema: TSchema;
  execute(args: unknown, ctx: ToolContext): Promise<ToolResult>;
}
