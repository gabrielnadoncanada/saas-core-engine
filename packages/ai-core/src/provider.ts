import { AITextInput, AITextOutput, AIStreamEvent } from "./types";

export interface AIProvider {
  generate(input: AITextInput): Promise<AITextOutput>;
  stream(input: AITextInput): AsyncIterable<string>;

  // Preferred for SaaS: streaming + usage tracking
  streamEvents(input: AITextInput): AsyncIterable<AIStreamEvent>;
}
