import "server-only";

import { getOrgPlan, getOrgMonthlyUsage } from "./ai-usage.service";
import { AI_POLICY, normalizePlan } from "./ai-policy";
import { enforceRpmOrThrow } from "./ai-rate-limit.service";

export async function getAiPolicyForOrg(orgId: string) {
  const planRaw = await getOrgPlan(orgId);
  const plan = normalizePlan(planRaw);

  const policy = AI_POLICY[plan];
  const monthly = await getOrgMonthlyUsage(orgId);

  return { plan, policy, monthly };
}

export async function enforceAiOrThrow(orgId: string) {
  const { plan, policy, monthly } = await getAiPolicyForOrg(orgId);

  // monthly tokens quota
  if (monthly.totalTokens >= policy.monthlyTokens) {
    const err = new Error("AI quota exceeded for this month.");
    // @ts-expect-error attach
    err.status = 402;
    // @ts-expect-error attach
    err.meta = { plan, quota: policy.monthlyTokens, used: monthly.totalTokens };
    throw err;
  }

  // per-minute requests
  const rpmInfo = await enforceRpmOrThrow(orgId, policy.rpm);

  return {
    plan,
    model: policy.model,
    quota: policy.monthlyTokens,
    used: monthly.totalTokens,
    rpm: policy.rpm,
    rpmCount: rpmInfo.count,
    rpmWindowStart: rpmInfo.windowStart,
  };
}
