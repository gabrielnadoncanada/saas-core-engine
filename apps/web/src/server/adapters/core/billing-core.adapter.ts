import {
  BillingWebhookOrchestrator,
  BillingSessionService,
  SubscriptionSyncService,
} from "@billing-core";
import { BillingSubscriptionCursorsRepo } from "@/server/db-repos/billing-subscription-cursors.repo";
import { BillingWebhookEventsRepo } from "@/server/db-repos/billing-webhook-events.repo";
import { OrgsRepo } from "@/server/db-repos/orgs.repo";
import { SubscriptionsRepo } from "@/server/db-repos/subscriptions.repo";
import { StripeBillingProvider } from "@/server/services/stripe.service";

export function createSubscriptionSyncService() {
  return new SubscriptionSyncService(new SubscriptionsRepo());
}

export function createBillingWebhookOrchestrator() {
  return new BillingWebhookOrchestrator(
    new BillingWebhookEventsRepo(),
    new BillingSubscriptionCursorsRepo(),
  );
}

export function createBillingSessionService() {
  return new BillingSessionService(
    new OrgsRepo(),
    new SubscriptionsRepo(),
    new StripeBillingProvider(),
  );
}
