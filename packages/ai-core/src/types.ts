import type { ZodTypeAny } from "zod";

export type AIRole = "system" | "user" | "assistant";

export interface AIMessage {
  role: AIRole;
  content: string;
}

export interface AITextInput {
  messages: AIMessage[];
  model: string;
  temperature?: number;
  userId: string;
  orgId: string;
}

export interface AITextOutput {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export type AIStreamEvent =
  | { type: "delta"; text: string }
  | { type: "usage"; inputTokens: number; outputTokens: number };

export interface AIStructuredInput<TSchema extends ZodTypeAny> {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  model: string;
  temperature?: number;
  schema: TSchema;
  userId: string;
  orgId: string;
}

export interface AIStructuredOutput<T> {
  data: T;
  usage: { inputTokens: number; outputTokens: number };
}
