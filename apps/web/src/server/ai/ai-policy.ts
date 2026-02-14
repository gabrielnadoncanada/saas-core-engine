export const AI_POLICY = {
  free: {
    model: "gpt-4o-mini",
    rpm: 10, // requests per minute per org
    monthlyTokens: 50_000,
  },
  pro: {
    model: "gpt-4.1-mini",
    rpm: 120,
    monthlyTokens: 2_000_000,
  },
} as const;

export type PlanKey = keyof typeof AI_POLICY;

export function normalizePlan(plan: string): PlanKey {
  if (plan === "pro") return "pro";
  return "free";
}
