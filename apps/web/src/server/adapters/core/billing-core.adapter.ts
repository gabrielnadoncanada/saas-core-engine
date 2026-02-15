import { SubscriptionSyncService } from "@billing-core";
import { SubscriptionsRepo } from "@/server/db-repos/subscriptions.repo";

export function createSubscriptionSyncService() {
  return new SubscriptionSyncService(new SubscriptionsRepo());
}
