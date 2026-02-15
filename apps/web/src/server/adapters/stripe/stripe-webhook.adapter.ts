import type Stripe from "stripe";
import type { BillingProviderSubscriptionSnapshot } from "@contracts";

export function mapStripeSubscriptionToSnapshot(
  sub: Stripe.Subscription,
): BillingProviderSubscriptionSnapshot {
  return {
    id: sub.id,
    status: sub.status,
    currentPeriodEndUnix: sub.current_period_end ?? null,
    priceId: sub.items.data[0]?.price?.id ?? null,
  };
}