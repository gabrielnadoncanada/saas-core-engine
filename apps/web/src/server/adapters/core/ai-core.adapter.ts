import {
  AIEnforcementService,
  AIPromptsService,
  AIRateLimitService,
  AIUsageService,
} from "@ai-core";
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
  return new AIEnforcementService(
    createAIUsageService(),
    createAIRateLimitService(),
  );
}

export function createAIPromptsService() {
  return new AIPromptsService(new AIPromptsRepo());
}

