import {
  AIBudgetService,
  AIEnforcementService,
  AIPromptsService,
  AIRateLimitService,
  AIUsageService,
} from "@ai-core";
import { AIBudgetsRepo } from "@/server/db-repos/ai-budgets.repo";
import { AIRateLimitRepo } from "@/server/db-repos/ai-rate-limit.repo";
import { AIPromptsRepo } from "@/server/db-repos/ai-prompts.repo";
import { AIUsageRepo } from "@/server/db-repos/ai-usage.repo";
import { SubscriptionsRepo } from "@/server/db-repos/subscriptions.repo";

class AIUsageSubscriptionRepoAdapter {
  constructor(private readonly subscriptions = new SubscriptionsRepo()) {}

  async findPlanByOrg(organizationId: string): Promise<string | null> {
    const sub = await this.subscriptions.findByOrg(organizationId);
    return sub?.plan ?? null;
  }
}

export function createAIUsageService() {
  return new AIUsageService(
    new AIUsageSubscriptionRepoAdapter(),
    new AIUsageRepo(),
  );
}

export function createAIRateLimitService() {
  return new AIRateLimitService(new AIRateLimitRepo());
}

export function createAIEnforcementService() {
  const usage = createAIUsageService();
  return new AIEnforcementService(
    usage,
    createAIRateLimitService(),
    new AIBudgetService(usage, new AIBudgetsRepo()),
  );
}

export function createAIPromptsService() {
  return new AIPromptsService(new AIPromptsRepo());
}

