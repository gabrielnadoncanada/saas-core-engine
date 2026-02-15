import type { ToolContext } from "./types";
import type { ToolRegistry } from "./registry";

export async function executeTool(
  registry: ToolRegistry,
  name: string,
  args: unknown,
  ctx: ToolContext,
) {
  const tool = registry.get(name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);

  const parsed = tool.schema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid tool args for ${name}`);
  }

  return tool.execute(parsed.data, ctx);
}
