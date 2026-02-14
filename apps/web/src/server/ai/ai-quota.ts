export const AI_QUOTAS = {
  free: { monthlyTokens: 50_000 }, // ajustable
  pro: { monthlyTokens: 2_000_000 }, // ajustable
} as const;

export function getMonthRange(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { start, end };
}
