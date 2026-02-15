export const DEFAULT_PROMPTS = {
  "chat.system": `You are a helpful assistant for this organization.
Follow these rules:
- Keep answers concise and actionable.
- If unsure, ask one clarification question.
- Never mention other organizations or data.
`,
} as const;

export type PromptKey = keyof typeof DEFAULT_PROMPTS;
