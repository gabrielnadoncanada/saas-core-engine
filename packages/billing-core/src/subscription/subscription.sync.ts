import type {
  BillingProviderSubscriptionSnapshot,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@contracts";
import { planFromPriceId } from "./plans";

export interface SubscriptionsRepo {
  upsertOrgSubscription(params: {
    organizationId: string;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    currentPeriodEnd?: Date | null;
  }): Promise<{ id: string }>;

  findByStripeSubscriptionId(
    stripeSubscriptionId: string,
  ): Promise<{
    organizationId: string;
    plan: SubscriptionPlan;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    currentPeriodEnd: Date | null;
  } | null>;
}

function mapProviderStatus(status: string): SubscriptionStatus {
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
  constructor(private readonly subs: SubscriptionsRepo) {}

  async syncFromProviderSubscription(params: {
    organizationId: string;
    subscription: BillingProviderSubscriptionSnapshot;
    stripeCustomerId: string | null;
    proMonthlyPriceId: string;
  }) {
    const plan = planFromPriceId(
      params.subscription.priceId,
      params.proMonthlyPriceId,
    );

    const status = mapProviderStatus(params.subscription.status);
    const currentPeriodEnd = params.subscription.currentPeriodEndUnix
      ? new Date(params.subscription.currentPeriodEndUnix * 1000)
      : null;

    await this.subs.upsertOrgSubscription({
      organizationId: params.organizationId,
      plan,
      status,
      stripeCustomerId: params.stripeCustomerId ?? null,
      stripeSubscriptionId: params.subscription.id,
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
