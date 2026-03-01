import "server-only";

import { prisma } from "@db";

import type Stripe from "stripe";

import { createSubscriptionSyncService } from "@/server/adapters/core/billing-core.adapter";
import { mapStripeSubscriptionToSnapshot } from "@/server/adapters/stripe/stripe-webhook.adapter";
import { env } from "@/server/config/env";
import { stripe } from "@/server/services/stripe.service";

/**
 * Processes a verified Stripe event directly (no DB round-trip).
 * Idempotency and ordering are handled by the orchestrator in the route.
 */
export async function processStripeEvent(event: Stripe.Event): Promise<void> {
  if (!env.STRIPE_PRICE_PRO_MONTHLY) return;
  const sync = createSubscriptionSyncService();
  const s = stripe();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const orgId = session.metadata?.["organizationId"];
      const providerCustomerId = typeof session.customer === "string" ? session.customer : null;
      const subId = typeof session.subscription === "string" ? session.subscription : null;

      if (orgId && providerCustomerId) {
        await prisma.subscription.upsert({
          where: { organizationId: orgId },
          create: {
            organizationId: orgId,
            plan: "free",
            status: "inactive",
            providerCustomerId,
          },
          update: { providerCustomerId },
        });
      }

      if (orgId && subId) {
        const sub = await s.subscriptions.retrieve(subId);
        await sync.syncFromProviderSubscription({
          organizationId: orgId,
          subscription: mapStripeSubscriptionToSnapshot(sub),
          providerCustomerId,
          proMonthlyPriceId: env.STRIPE_PRICE_PRO_MONTHLY,
        });
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object;
      const orgId = sub.metadata?.["organizationId"];
      const providerCustomerId = typeof sub.customer === "string" ? sub.customer : null;
      if (orgId) {
        await sync.syncFromProviderSubscription({
          organizationId: orgId,
          subscription: mapStripeSubscriptionToSnapshot(sub),
          providerCustomerId,
          proMonthlyPriceId: env.STRIPE_PRICE_PRO_MONTHLY,
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await sync.markCanceled({ providerSubscriptionId: sub.id });
      break;
    }
    case "invoice.payment_succeeded":
    case "invoice.payment_failed":
    default:
      break;
  }
}
