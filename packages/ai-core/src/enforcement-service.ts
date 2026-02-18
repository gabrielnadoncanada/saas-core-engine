import { AI_POLICY, normalizePlan } from "./policy";
import type { AIRateLimitService } from "./rate-limit-service";
import type { AIUsageService } from "./usage-service";

export class AIEnforcementService {
  constructor(
    private readonly usage: AIUsageService,
    private readonly rateLimit: AIRateLimitService,
  ) {}

  async getAiPolicyForOrg(orgId: string) {
    const planRaw = await this.usage.getOrgPlan(orgId);
    const plan = normalizePlan(planRaw);
    const policy = AI_POLICY[plan];
    const monthly = await this.usage.getOrgMonthlyUsage(orgId);
    return { plan, policy, monthly };
  }

  async enforceAiOrThrow(orgId: string) {
    const { plan, policy, monthly } = await this.getAiPolicyForOrg(orgId);

    if (monthly.totalTokens >= policy.monthlyTokens) {
      const err = new Error("AI quota exceeded for this month.");
      Object.assign(err, {
        status: 402,
        meta: { plan, quota: policy.monthlyTokens, used: monthly.totalTokens },
      });
      throw err;
    }

    const rpmInfo = await this.rateLimit.enforceRpmOrThrow(orgId, policy.rpm);
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
}

