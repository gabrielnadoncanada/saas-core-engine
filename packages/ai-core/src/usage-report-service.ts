export type AIUsageReportRow = {
  createdAt: Date;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  userId: string;
};

export type AIUsageReportUser = {
  id: string;
  email: string;
};

export function buildAIUsageReport(params: {
  rows: AIUsageReportRow[];
  users: AIUsageReportUser[];
  budgetUsd: number;
  alertThresholdPct: number;
  hardStopEnabled: boolean;
}) {
  const emailById = new Map(params.users.map((u) => [u.id, u.email] as const));

  const byUser = new Map<
    string,
    { inputTokens: number; outputTokens: number; costUsd: number }
  >();

  const daily = new Map<string, { day: string; tokens: number; costUsd: number }>();

  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;

  let monthlyInputTokens = 0;
  let monthlyOutputTokens = 0;
  let monthlyCostUsd = 0;

  for (const row of params.rows) {
    monthlyInputTokens += row.inputTokens;
    monthlyOutputTokens += row.outputTokens;
    monthlyCostUsd += row.costUsd;

    const userAgg = byUser.get(row.userId) ?? {
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
    };
    userAgg.inputTokens += row.inputTokens;
    userAgg.outputTokens += row.outputTokens;
    userAgg.costUsd += row.costUsd;
    byUser.set(row.userId, userAgg);

    const day = dayKey(row.createdAt);
    const dayAgg = daily.get(day) ?? { day, tokens: 0, costUsd: 0 };
    dayAgg.tokens += row.inputTokens + row.outputTokens;
    dayAgg.costUsd += row.costUsd;
    daily.set(day, dayAgg);
  }

  const usagePct =
    params.budgetUsd > 0 ? Math.round((monthlyCostUsd / params.budgetUsd) * 100) : 0;

  return {
    monthly: {
      inputTokens: monthlyInputTokens,
      outputTokens: monthlyOutputTokens,
      totalTokens: monthlyInputTokens + monthlyOutputTokens,
      costUsd: monthlyCostUsd,
    },
    daily: Array.from(daily.values()).sort((a, b) => (a.day < b.day ? -1 : 1)),
    users: Array.from(byUser.entries())
      .map(([userId, agg]) => ({
        userId,
        email: emailById.get(userId) ?? `${userId.slice(0, 8)}...`,
        tokens: agg.inputTokens + agg.outputTokens,
        inputTokens: agg.inputTokens,
        outputTokens: agg.outputTokens,
        costUsd: agg.costUsd,
      }))
      .sort((a, b) => b.tokens - a.tokens),
    budget: {
      monthlyBudgetUsd: params.budgetUsd,
      usagePct,
      inAlert: usagePct >= params.alertThresholdPct,
      alertThresholdPct: params.alertThresholdPct,
      hardStopEnabled: params.hardStopEnabled,
    },
  };
}
