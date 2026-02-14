export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  // Rough estimates — adjust per model
  if (model.includes("gpt-4")) {
    return inputTokens * 0.00001 + outputTokens * 0.00003;
  }

  return inputTokens * 0.000002 + outputTokens * 0.000002;
}
