import type { AITool } from "./types";

export class ToolRegistry {
  private tools = new Map<string, AITool>();

  register(tool: AITool) {
    if (this.tools.has(tool.name))
      throw new Error(`Tool already registered: ${tool.name}`);
    this.tools.set(tool.name, tool);
  }

  get(name: string) {
    return this.tools.get(name) ?? null;
  }

  list() {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
    }));
  }
}
