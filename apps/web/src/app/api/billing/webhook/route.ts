import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/server/services/stripe.service";
import { env } from "@/server/config/env";
import { prisma } from "@db";
import {
  createStripeWebhookOrchestrator,
  createSubscriptionSyncService,
} from "@/server/adapters/core/billing-core.adapter";
import { mapStripeSubscriptionToSnapshot } from "@/server/adapters/stripe/stripe-webhook.adapter";
import { withApiTelemetry } from "@/server/telemetry/otel";

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

function constructStripeEvent(
  s: ReturnType<typeof stripe>,
  body: string,
  signature: string,
): Stripe.Event | null {
  try {
    return s.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  return withApiTelemetry(req, "/api/billing/webhook", async () => {
    const sig = req.headers.get("stripe-signature");
    if (!sig) return NextResponse.json({ ok: false }, { status: 400 });

    const body = await req.text();
    const s = stripe();

    const event = constructStripeEvent(s, body, sig);
    if (!event) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const sync = createSubscriptionSyncService();
    const orchestrator = createStripeWebhookOrchestrator();
    const stripeSubscriptionId = extractStripeSubscriptionId(event);
    const organizationId = extractOrganizationId(event);
    const createdAt = eventCreatedAt(event);

    try {
      const begin = await orchestrator.begin({
        id: event.id,
        type: event.type,
        createdAt,
        organizationId,
        stripeSubscriptionId,
      });

      if (begin === "duplicate") {
        return NextResponse.json({ received: true, duplicate: true });
      }
      if (begin === "ignored") {
        return NextResponse.json({ received: true, ignored: true });
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

      await orchestrator.complete({
        id: event.id,
        type: event.type,
        createdAt,
        organizationId,
        stripeSubscriptionId,
      });

      return NextResponse.json({ received: true });
    } catch (error) {
      await orchestrator.fail(
        event.id,
        error instanceof Error ? error.message : "unknown_error",
      );
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  });
}
