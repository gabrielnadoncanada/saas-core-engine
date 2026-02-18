import { AIEnforcementError } from "./errors";
import { AI_POLICY, normalizePlan } from "./policy";
import { getMonthRange } from "./quota";

export interface AIUsageSubscriptionRepo {
  findPlanByOrg(organizationId: string): Promise<string | null>;
}

export interface AIUsageRepo {
  aggregateOrgMonthlyUsage(params: {
    organizationId: string;
    start: Date;
    end: Date;
  }): Promise<{
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  }>;
}

export class AIUsageService {
  constructor(
    private readonly subscriptions: AIUsageSubscriptionRepo,
    private readonly usage: AIUsageRepo,
  ) {}

  async getOrgPlan(orgId: string) {
    return (await this.subscriptions.findPlanByOrg(orgId)) ?? "free";
  }

  async getOrgMonthlyUsage(orgId: string, at = new Date()) {
    const { start, end } = getMonthRange(at);
    const agg = await this.usage.aggregateOrgMonthlyUsage({
      organizationId: orgId,
      start,
      end,
    });

    return {
      inputTokens: agg.inputTokens,
      outputTokens: agg.outputTokens,
      totalTokens: agg.inputTokens + agg.outputTokens,
      costUsd: agg.costUsd,
    };
  }

  async enforceQuotaOrThrow(orgId: string) {
    const plan = await this.getOrgPlan(orgId);
    const quota = AI_POLICY[normalizePlan(plan)].monthlyTokens;
    const usage = await this.getOrgMonthlyUsage(orgId);

    if (usage.totalTokens >= quota) {
      throw new AIEnforcementError("AI quota exceeded for this month.", 402, {
        plan,
        quota,
        used: usage.totalTokens,
      });
    }

    return { plan, quota, used: usage.totalTokens };
  }
}

