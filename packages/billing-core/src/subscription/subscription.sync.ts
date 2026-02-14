import type Stripe from "stripe";
import type { SubscriptionStatus } from "@prisma/client";
import { SubscriptionsRepo } from "@db";
import { getSubscriptionMainPriceId, planFromPriceId } from "./plans";

function mapStripeStatus(
  status: Stripe.Subscription.Status,
): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "unpaid":
      return "unpaid";
    default:
      return "inactive";
  }
}

export class SubscriptionSyncService {
  constructor(private readonly subs = new SubscriptionsRepo()) {}

  async syncFromStripeSubscription(params: {
    organizationId: string;
    stripeSubscription: Stripe.Subscription;
    stripeCustomerId: string | null;
    proMonthlyPriceId: string;
  }) {
    const priceId = getSubscriptionMainPriceId(params.stripeSubscription);
    const plan = planFromPriceId(priceId, params.proMonthlyPriceId);

    const status = mapStripeStatus(params.stripeSubscription.status);
    const currentPeriodEnd = params.stripeSubscription.current_period_end
      ? new Date(params.stripeSubscription.current_period_end * 1000)
      : null;

    await this.subs.upsertOrgSubscription({
      organizationId: params.organizationId,
      plan,
      status,
      stripeCustomerId: params.stripeCustomerId ?? null,
      stripeSubscriptionId: params.stripeSubscription.id,
      currentPeriodEnd,
    });
  }

  async markCanceled(params: { stripeSubscriptionId: string }) {
    const existing = await this.subs.findByStripeSubscriptionId(
      params.stripeSubscriptionId,
    );
    if (!existing) return;

    await this.subs.upsertOrgSubscription({
      organizationId: existing.organizationId,
      plan: existing.plan,
      status: "canceled",
      stripeCustomerId: existing.stripeCustomerId ?? null,
      stripeSubscriptionId: existing.stripeSubscriptionId ?? null,
      currentPeriodEnd: existing.currentPeriodEnd ?? null,
    });
  }
}
