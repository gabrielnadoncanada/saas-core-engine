import { planFromPriceId } from "./plans";

import type {
  BillingProviderSubscriptionSnapshot,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@contracts";

export interface SubscriptionsRepo {
  upsertOrgSubscription(params: {
    organizationId: string;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    providerCustomerId?: string | null;
    providerSubscriptionId?: string | null;
    currentPeriodEnd?: Date | null;
    needsReconcile?: boolean;
    lastSyncedAt?: Date | null;
    lastProviderSnapshotAt?: Date | null;
  }): Promise<{ id: string }>;

  findByProviderSubscriptionId(
    providerSubscriptionId: string,
  ): Promise<{
    organizationId: string;
    plan: SubscriptionPlan;
    providerCustomerId: string | null;
    providerSubscriptionId: string | null;
    currentPeriodEnd: Date | null;
    needsReconcile: boolean;
    lastSyncedAt: Date | null;
    lastProviderSnapshotAt: Date | null;
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
    providerCustomerId: string | null;
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
      providerCustomerId: params.providerCustomerId ?? null,
      providerSubscriptionId: params.subscription.id,
      currentPeriodEnd,
      needsReconcile: false,
      lastSyncedAt: new Date(),
      lastProviderSnapshotAt: new Date(),
    });
  }

  async markCanceled(params: { providerSubscriptionId: string }) {
    const existing = await this.subs.findByProviderSubscriptionId(
      params.providerSubscriptionId,
    );
    if (!existing) return;

    await this.subs.upsertOrgSubscription({
      organizationId: existing.organizationId,
      plan: existing.plan,
      status: "canceled",
      providerCustomerId: existing.providerCustomerId ?? null,
      providerSubscriptionId: existing.providerSubscriptionId ?? null,
      currentPeriodEnd: existing.currentPeriodEnd ?? null,
      needsReconcile: false,
      lastSyncedAt: new Date(),
      lastProviderSnapshotAt: new Date(),
    });
  }
}
