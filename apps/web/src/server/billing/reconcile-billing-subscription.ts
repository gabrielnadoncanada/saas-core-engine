import "server-only";

import { prisma } from "@db";

import { createSubscriptionSyncService } from "@/server/adapters/core/billing-core.adapter";
import { mapStripeSubscriptionToSnapshot } from "@/server/adapters/stripe/stripe-webhook.adapter";
import { env } from "@/server/config/env";
import { stripe } from "@/server/services/stripe.service";

export async function reconcileOrganizationSubscription(
  organizationId: string,
): Promise<{ reconciled: boolean; reason?: string }> {
  const existing = await prisma.subscription.findUnique({
    where: { organizationId },
    select: {
      organizationId: true,
      providerCustomerId: true,
      providerSubscriptionId: true,
      plan: true,
      status: true,
      currentPeriodEnd: true,
      needsReconcile: true,
      lastSyncedAt: true,
      lastProviderSnapshotAt: true,
    },
  });

  if (!existing) return { reconciled: false, reason: "subscription_not_found" };
  if (!existing.providerSubscriptionId) {
    await prisma.subscription.update({
      where: { organizationId },
      data: {
        needsReconcile: false,
        lastSyncedAt: new Date(),
      },
    });
    return { reconciled: false, reason: "provider_subscription_missing" };
  }
  if (!env.STRIPE_PRICE_PRO_MONTHLY) {
    return { reconciled: false, reason: "billing_not_configured" };
  }

  const s = stripe();
  const providerSubscription = await s.subscriptions.retrieve(existing.providerSubscriptionId);
  const sync = createSubscriptionSyncService();
  await sync.syncFromProviderSubscription({
    organizationId,
    subscription: mapStripeSubscriptionToSnapshot(providerSubscription),
    providerCustomerId:
      typeof providerSubscription.customer === "string"
        ? providerSubscription.customer
        : existing.providerCustomerId,
    proMonthlyPriceId: env.STRIPE_PRICE_PRO_MONTHLY,
  });

  return { reconciled: true };
}
