import "server-only";

import { prisma } from "@db";
import { AI_QUOTAS, getMonthRange } from "./ai-quota";

export async function getOrgPlan(orgId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
  });
  return sub?.plan ?? "free";
}

export async function getOrgMonthlyUsage(orgId: string, at = new Date()) {
  const { start, end } = getMonthRange(at);

  const agg = await prisma.aIUsage.aggregate({
    where: { organizationId: orgId, createdAt: { gte: start, lt: end } },
    _sum: { inputTokens: true, outputTokens: true, costUsd: true },
  });

  const input = agg._sum.inputTokens ?? 0;
  const output = agg._sum.outputTokens ?? 0;
  const cost = agg._sum.costUsd ?? 0;

  return {
    inputTokens: input,
    outputTokens: output,
    totalTokens: input + output,
    costUsd: cost,
  };
}

export async function enforceQuotaOrThrow(orgId: string) {
  const plan = await getOrgPlan(orgId);
  const quota = AI_QUOTAS[plan]?.monthlyTokens ?? AI_QUOTAS.free.monthlyTokens;

  const usage = await getOrgMonthlyUsage(orgId);

  if (usage.totalTokens >= quota) {
    const err = new Error("AI quota exceeded for this month.");
    // @ts-expect-error attach status for route
    err.status = 402;
    // @ts-expect-error attach metadata
    err.meta = { plan, quota, used: usage.totalTokens };
    throw err;
  }

  return { plan, quota, used: usage.totalTokens };
}
