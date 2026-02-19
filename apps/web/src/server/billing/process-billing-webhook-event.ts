import type Stripe from "stripe";
import {
  billingEventCreatedAt,
  extractBillingSubscriptionId,
  extractOrganizationId,
} from "@billing-core";
import { stripe } from "@/server/services/stripe.service";
import { env } from "@/server/config/env";
import {
  createBillingWebhookOrchestrator,
  createSubscriptionSyncService,
} from "@/server/adapters/core/billing-core.adapter";
import { mapStripeSubscriptionToSnapshot } from "@/server/adapters/stripe/stripe-webhook.adapter";
import { BillingWebhookEventsRepo } from "@/server/db-repos/billing-webhook-events.repo";
import { prisma } from "@db";

export async function processBillingWebhookEventById(eventId: string): Promise<"processed" | "ignored"> {
  const eventsRepo = new BillingWebhookEventsRepo();
  const payload = await eventsRepo.getPayloadByEventId(eventId);
  if (!payload) throw new Error(`Missing payload for webhook event ${eventId}`);

  const event = payload as unknown as Stripe.Event;
  const sync = createSubscriptionSyncService();
  const orchestrator = createBillingWebhookOrchestrator();
  const s = stripe();

  const providerSubscriptionId = extractBillingSubscriptionId(event);
  const organizationId = extractOrganizationId(event);
  const createdAt = billingEventCreatedAt(event);

  const begin = await orchestrator.begin({
    id: event.id,
    type: event.type,
    createdAt,
    organizationId,
    providerSubscriptionId,
  });

  if (begin === "duplicate" || begin === "ignored") return "ignored";

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
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
      const sub = event.data.object as Stripe.Subscription;
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
      const sub = event.data.object as Stripe.Subscription;
      await sync.markCanceled({ providerSubscriptionId: sub.id });
      break;
    }
    case "invoice.payment_succeeded":
    case "invoice.payment_failed":
    default:
      break;
  }

  await orchestrator.complete({
    id: event.id,
    type: event.type,
    createdAt,
    organizationId,
    providerSubscriptionId,
  });

  return "processed";
}
