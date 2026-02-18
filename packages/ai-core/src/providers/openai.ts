import OpenAI from "openai";
import type { AIProvider } from "../provider";
import type { AIStreamEvent, AITextInput, AITextOutput } from "../types";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { ZodTypeAny } from "zod";
import type { AIStructuredInput, AIStructuredOutput } from "../types";

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error("OPENAI_API_KEY is missing");
    this.client = new OpenAI({ apiKey });
  }

  async generate(input: AITextInput): Promise<AITextOutput> {
    const response = await this.client.chat.completions.create({
      model: input.model,
      messages: input.messages,
      temperature: input.temperature ?? 0.7,
    });

    const text = response.choices[0]?.message?.content ?? "";

    return {
      text,
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
    };
  }

  async *stream(input: AITextInput): AsyncIterable<string> {
    for await (const ev of this.streamEvents(input)) {
      if (ev.type === "delta") yield ev.text;
    }
  }

  async *streamEvents(input: AITextInput): AsyncIterable<AIStreamEvent> {
    const stream = await this.client.chat.completions.create({
      model: input.model,
      messages: input.messages,
      temperature: input.temperature ?? 0.7,
      stream: true,
      // This is the key: usage appears in the final chunks
      stream_options: { include_usage: true },
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield { type: "delta", text: delta };

      const usage = (chunk as any).usage;
      // usage is usually only present at the end when include_usage=true
      if (usage?.prompt_tokens != null || usage?.completion_tokens != null) {
        yield {
          type: "usage",
          inputTokens: usage.prompt_tokens ?? 0,
          outputTokens: usage.completion_tokens ?? 0,
        };
      }
    }
  }

  async generateStructured<TSchema extends ZodTypeAny, TOut = unknown>(
    input: AIStructuredInput<TSchema>,
  ): Promise<AIStructuredOutput<TOut>> {
    const jsonSchema = zodToJsonSchema(input.schema, "schema");

    const response = await this.client.chat.completions.create({
      model: input.model,
      messages: [
        ...input.messages,
        {
          role: "system",
          content:
            "Return ONLY valid JSON matching the provided schema. No markdown, no extra keys.",
        },
      ],
      temperature: input.temperature ?? 0,
      response_format: {
        type: "json_schema" as any,
        json_schema: {
          name: "schema",
          schema:
            (jsonSchema as any).definitions?.schema ?? (jsonSchema as any),
          strict: true,
        },
      } as any,
    });

    const text = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text);
    const validated = input.schema.parse(parsed);

    return {
      data: validated as unknown as TOut,
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
    };
  }
}
