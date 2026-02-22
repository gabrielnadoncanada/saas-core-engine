import {
  billingEventCreatedAt,
  extractBillingSubscriptionId,
  extractOrganizationId,
  shouldIgnoreOutOfOrderEvent,
} from "@billing-core";
import { prisma } from "@db";

import type Stripe from "stripe";

import {
  createBillingWebhookEventsRepo,
  createBillingSubscriptionCursorsRepo,
  createSubscriptionSyncService,
} from "@/server/adapters/core/billing-core.adapter";
import { mapStripeSubscriptionToSnapshot } from "@/server/adapters/stripe/stripe-webhook.adapter";
import { env } from "@/server/config/env";
import { BillingWebhookEventsRepo } from "@/server/db-repos/billing-webhook-events.repo";
import { stripe } from "@/server/services/stripe.service";


export async function processBillingWebhookEventById(eventId: string): Promise<"processed" | "ignored"> {
  const eventsRepo = new BillingWebhookEventsRepo();
  const payload = await eventsRepo.getPayloadByEventId(eventId);
  if (!payload) throw new Error(`Missing payload for webhook event ${eventId}`);

  const event = payload as unknown as Stripe.Event;
  const sync = createSubscriptionSyncService();
  const cursorsRepo = createBillingSubscriptionCursorsRepo();
  const webhookEventsRepo = createBillingWebhookEventsRepo();
  const s = stripe();

  const providerSubscriptionId = extractBillingSubscriptionId(event);
  const organizationId = extractOrganizationId(event);
  const createdAt = billingEventCreatedAt(event);

  if (providerSubscriptionId) {
    const cursor = await cursorsRepo.findByProviderSubscriptionId(
      providerSubscriptionId,
    );
    if (
      shouldIgnoreOutOfOrderEvent(cursor, {
        id: event.id,
        type: event.type,
        createdAt,
      })
    ) {
      await webhookEventsRepo.markStatus({
        eventId: event.id,
        status: "ignored_out_of_order",
      });
      return "ignored";
    }
  }

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

  if (providerSubscriptionId) {
    await cursorsRepo.upsert({
      providerSubscriptionId,
      lastEventCreatedAt: createdAt,
      lastEventId: event.id,
      lastEventType: event.type,
    });
  }

  await webhookEventsRepo.markStatus({
    eventId: event.id,
    status: "processed",
  });

  return "processed";
}
