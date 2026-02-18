import { StripeWebhookOrchestrator, SubscriptionSyncService } from "@billing-core";
import { BillingSubscriptionCursorsRepo } from "@/server/db-repos/billing-subscription-cursors.repo";
import { BillingWebhookEventsRepo } from "@/server/db-repos/billing-webhook-events.repo";
import { SubscriptionsRepo } from "@/server/db-repos/subscriptions.repo";

export function createSubscriptionSyncService() {
  return new SubscriptionSyncService(new SubscriptionsRepo());
}

export function createStripeWebhookOrchestrator() {
  return new StripeWebhookOrchestrator(
    new BillingWebhookEventsRepo(),
    new BillingSubscriptionCursorsRepo(),
  );
}
