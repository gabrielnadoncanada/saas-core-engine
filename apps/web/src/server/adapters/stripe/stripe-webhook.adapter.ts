import type { BillingProviderSubscriptionSnapshot } from "@contracts";
import type Stripe from "stripe";

export function mapStripeSubscriptionToSnapshot(
  sub: Stripe.Subscription,
): BillingProviderSubscriptionSnapshot {
  const withPeriod = sub as Stripe.Subscription & { current_period_end?: number };
  return {
    id: sub.id,
    status: sub.status,
    currentPeriodEndUnix: withPeriod.current_period_end ?? null,
    priceId: sub.items.data[0]?.price?.id ?? null,
  };
}
