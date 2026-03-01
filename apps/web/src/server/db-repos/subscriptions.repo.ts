import { prisma, type DbTx } from "@db";

import type {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@db";

const db = (tx?: DbTx) => tx ?? prisma;

export class SubscriptionsRepo {
  async upsertOrgSubscription(
    params: {
      organizationId: string;
      plan: SubscriptionPlan;
      status: SubscriptionStatus;
      providerCustomerId?: string | null;
      providerSubscriptionId?: string | null;
      currentPeriodEnd?: Date | null;
      needsReconcile?: boolean;
      lastSyncedAt?: Date | null;
      lastProviderSnapshotAt?: Date | null;
    },
    tx?: DbTx,
  ): Promise<Subscription> {
    return db(tx).subscription.upsert({
      where: { organizationId: params.organizationId },
      create: {
        organizationId: params.organizationId,
        plan: params.plan,
        status: params.status,
        providerCustomerId: params.providerCustomerId ?? null,
        providerSubscriptionId: params.providerSubscriptionId ?? null,
        currentPeriodEnd: params.currentPeriodEnd ?? null,
        needsReconcile: params.needsReconcile ?? false,
        lastSyncedAt: params.lastSyncedAt ?? null,
        lastProviderSnapshotAt: params.lastProviderSnapshotAt ?? null,
      },
      update: {
        plan: params.plan,
        status: params.status,
        providerCustomerId: params.providerCustomerId ?? null,
        providerSubscriptionId: params.providerSubscriptionId ?? null,
        currentPeriodEnd: params.currentPeriodEnd ?? null,
        needsReconcile: params.needsReconcile ?? false,
        lastSyncedAt: params.lastSyncedAt ?? null,
        lastProviderSnapshotAt: params.lastProviderSnapshotAt ?? null,
      },
    });
  }

  async findByOrg(
    organizationId: string,
    tx?: DbTx,
  ): Promise<Subscription | null> {
    return db(tx).subscription.findUnique({ where: { organizationId } });
  }

  async findByProviderSubscriptionId(
    providerSubscriptionId: string,
    tx?: DbTx,
  ): Promise<Subscription | null> {
    return db(tx).subscription.findFirst({
      where: { providerSubscriptionId },
    });
  }
}
