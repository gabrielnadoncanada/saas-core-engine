import type {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";
import { getDb, type DbTx } from "../tx";

export class SubscriptionsRepo {
  async upsertOrgSubscription(
    params: {
      organizationId: string;
      plan: SubscriptionPlan;
      status: SubscriptionStatus;
      stripeCustomerId?: string | null;
      stripeSubscriptionId?: string | null;
      currentPeriodEnd?: Date | null;
    },
    tx?: DbTx,
  ): Promise<Subscription> {
    return getDb(tx).subscription.upsert({
      where: { organizationId: params.organizationId },
      create: {
        organizationId: params.organizationId,
        plan: params.plan,
        status: params.status,
        stripeCustomerId: params.stripeCustomerId ?? null,
        stripeSubscriptionId: params.stripeSubscriptionId ?? null,
        currentPeriodEnd: params.currentPeriodEnd ?? null,
      },
      update: {
        plan: params.plan,
        status: params.status,
        stripeCustomerId: params.stripeCustomerId ?? null,
        stripeSubscriptionId: params.stripeSubscriptionId ?? null,
        currentPeriodEnd: params.currentPeriodEnd ?? null,
      },
    });
  }

  async findByOrg(
    organizationId: string,
    tx?: DbTx,
  ): Promise<Subscription | null> {
    return getDb(tx).subscription.findUnique({ where: { organizationId } });
  }

  async findByStripeSubscriptionId(
    stripeSubscriptionId: string,
    tx?: DbTx,
  ): Promise<Subscription | null> {
    return getDb(tx).subscription.findFirst({
      where: { stripeSubscriptionId },
    });
  }
}
