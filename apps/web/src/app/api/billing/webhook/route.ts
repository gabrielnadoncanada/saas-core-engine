import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/server/services/stripe.service";
import { env } from "@/server/config/env";
import { prisma } from "@db";
import { createSubscriptionSyncService } from "@/server/adapters/core/billing-core.adapter";
import { mapStripeSubscriptionToSnapshot } from "@/server/adapters/stripe/stripe-webhook.adapter";
import { shouldIgnoreOutOfOrderEvent } from "@/server/billing/webhook-ordering";

const db = prisma as typeof prisma & {
  billingWebhookEvent: {
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
  };
  billingSubscriptionCursor: {
    findUnique: (args: unknown) => Promise<{
      lastEventCreatedAt: Date;
      lastEventId: string;
      lastEventType: string;
    } | null>;
    upsert: (args: unknown) => Promise<unknown>;
  };
};

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  return code === "P2002";
}

function eventCreatedAt(event: Stripe.Event): Date {
  return new Date(event.created * 1000);
}

function extractStripeSubscriptionId(event: Stripe.Event): string | null {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      return typeof session.subscription === "string" ? session.subscription : null;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      return sub.id;
    }
    default:
      return null;
  }
}

function extractOrganizationId(event: Stripe.Event): string | null {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      return session.metadata?.["organizationId"] ?? null;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      return sub.metadata?.["organizationId"] ?? null;
    }
    default:
      return null;
  }
}

async function markEventStatus(params: {
  eventId: string;
  status: string;
  errorMessage?: string;
}) {
  await db.billingWebhookEvent.update({
    where: { eventId: params.eventId },
    data: {
      status: params.status,
      errorMessage: params.errorMessage ?? null,
      processedAt: new Date(),
    },
  });
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ ok: false }, { status: 400 });

  const body = await req.text();
  const s = stripe();

  let event: Stripe.Event;

  try {
    event = s.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const sync = createSubscriptionSyncService();
  const stripeSubscriptionId = extractStripeSubscriptionId(event);
  const organizationId = extractOrganizationId(event);
  const createdAt = eventCreatedAt(event);

  try {
    await db.billingWebhookEvent.create({
      data: {
        provider: "stripe",
        eventId: event.id,
        eventType: event.type,
        eventCreatedAt: createdAt,
        organizationId,
        stripeSubscriptionId,
        status: "received",
      },
    });
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  try {
    if (stripeSubscriptionId) {
      const cursor = (await db.billingSubscriptionCursor.findUnique({
        where: { stripeSubscriptionId },
      })) as {
        lastEventCreatedAt: Date;
        lastEventId: string;
        lastEventType: string;
      } | null;
      if (
        shouldIgnoreOutOfOrderEvent(cursor, {
          id: event.id,
          type: event.type,
          createdAt,
        })
      ) {
        await markEventStatus({
          eventId: event.id,
          status: "ignored_out_of_order",
        });
        return NextResponse.json({ received: true, ignored: true });
      }
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const organizationId = session.metadata?.["organizationId"];
        const stripeCustomerId =
          typeof session.customer === "string" ? session.customer : null;
        const stripeSubscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : null;

        if (organizationId && stripeCustomerId) {
          await prisma.subscription.upsert({
            where: { organizationId },
            create: {
              organizationId,
              plan: "free",
              status: "inactive",
              stripeCustomerId,
            },
            update: { stripeCustomerId },
          });
        }

        if (organizationId && stripeSubscriptionId) {
          const sub = await s.subscriptions.retrieve(stripeSubscriptionId);
          await sync.syncFromProviderSubscription({
            organizationId,
            subscription: mapStripeSubscriptionToSnapshot(sub),
            stripeCustomerId,
            proMonthlyPriceId: env.STRIPE_PRICE_PRO_MONTHLY,
          });
        }

        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;

        const organizationId = sub.metadata?.["organizationId"];
        const stripeCustomerId =
          typeof sub.customer === "string" ? sub.customer : null;

        if (organizationId) {
          await sync.syncFromProviderSubscription({
            organizationId,
            subscription: mapStripeSubscriptionToSnapshot(sub),
            stripeCustomerId,
            proMonthlyPriceId: env.STRIPE_PRICE_PRO_MONTHLY,
          });
        }

        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await sync.markCanceled({ stripeSubscriptionId: sub.id });
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.payment_failed":
      default:
        break;
    }

    if (stripeSubscriptionId) {
      await db.billingSubscriptionCursor.upsert({
        where: { stripeSubscriptionId },
        create: {
          stripeSubscriptionId,
          lastEventCreatedAt: createdAt,
          lastEventId: event.id,
          lastEventType: event.type,
        },
        update: {
          lastEventCreatedAt: createdAt,
          lastEventId: event.id,
          lastEventType: event.type,
        },
      });
    }

    await markEventStatus({ eventId: event.id, status: "processed" });

    return NextResponse.json({ received: true });
  } catch (error) {
    await markEventStatus({
      eventId: event.id,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
