import { AITextInput, AITextOutput, AIStreamEvent } from "./types";
import type { ZodTypeAny } from "zod";
import type { AIStructuredInput, AIStructuredOutput } from "./types";

export interface AIProvider {
  generate(input: AITextInput): Promise<AITextOutput>;
  stream(input: AITextInput): AsyncIterable<string>;

  // Preferred for SaaS: streaming + usage tracking
  streamEvents(input: AITextInput): AsyncIterable<AIStreamEvent>;

  generateStructured<TSchema extends ZodTypeAny, TOut = unknown>(
    input: AIStructuredInput<TSchema>,
  ): Promise<AIStructuredOutput<TOut>>;
}
