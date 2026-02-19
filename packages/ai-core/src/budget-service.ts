import { AI_POLICY, normalizePlan } from "./policy";
import type { AIUsageService } from "./usage-service";

export interface AIBudgetRepo {
  findByOrg(organizationId: string): Promise<{
    monthlyBudgetUsd: number;
    alertThresholdPct: number;
    hardStopEnabled: boolean;
  } | null>;
}

export class AIBudgetService {
  constructor(
    private readonly usage: AIUsageService,
    private readonly budgets: AIBudgetRepo,
  ) {}

  async enforceBudgetOrThrow(orgId: string, planRaw: string) {
    const monthly = await this.usage.getOrgMonthlyUsage(orgId);
    const plan = normalizePlan(planRaw);
    const policyBudget = AI_POLICY[plan].monthlyBudgetUsd;
    const customBudget = await this.budgets.findByOrg(orgId);

    const budgetUsd = customBudget?.monthlyBudgetUsd ?? policyBudget;
    const alertThresholdPct = customBudget?.alertThresholdPct ?? 80;
    const hardStopEnabled = customBudget?.hardStopEnabled ?? true;

    const usedUsd = monthly.costUsd;
    const usagePct = budgetUsd > 0 ? Math.round((usedUsd / budgetUsd) * 100) : 0;
    const inAlert = budgetUsd > 0 && usagePct >= alertThresholdPct;
    const blocked = hardStopEnabled && budgetUsd > 0 && usedUsd >= budgetUsd;

    if (blocked) {
      const err = new Error("AI budget exceeded for this month.");
      Object.assign(err, {
        status: 402,
        meta: {
          budgetUsd,
          usedUsd,
          usagePct,
          alertThresholdPct,
          hardStopEnabled,
        },
      });
      throw err;
    }

    return {
      budgetUsd,
      usedUsd,
      usagePct,
      alertThresholdPct,
      hardStopEnabled,
      inAlert,
      blocked,
    };
  }
}
