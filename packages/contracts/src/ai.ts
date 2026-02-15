export type AIRole = "system" | "user" | "assistant";

export interface AIMessage {
  role: AIRole;
  content: string;
}

export interface AIUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}