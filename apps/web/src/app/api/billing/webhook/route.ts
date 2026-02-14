import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/server/services/stripe.service";
import { env } from "@/server/config/env";
import { SubscriptionSyncService } from "@billing-core";
import { prisma } from "@db";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ ok: false }, { status: 400 });

  const body = await req.text(); // IMPORTANT: raw body for signature verification
  const s = stripe();

  let event: Stripe.Event;

  try {
    event = s.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const sync = new SubscriptionSyncService();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const organizationId = session.metadata?.organizationId;
        const stripeCustomerId =
          typeof session.customer === "string" ? session.customer : null;
        const stripeSubscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : null;

        if (organizationId && stripeCustomerId) {
          // Store customer id if missing
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

        // If session has subscription, fetch it and sync
        if (organizationId && stripeSubscriptionId) {
          const sub = await s.subscriptions.retrieve(stripeSubscriptionId);
          await sync.syncFromStripeSubscription({
            organizationId,
            stripeSubscription: sub,
            stripeCustomerId,
            proMonthlyPriceId: env.STRIPE_PRICE_PRO_MONTHLY,
          });
        }

        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;

        const organizationId = sub.metadata?.organizationId;
        const stripeCustomerId =
          typeof sub.customer === "string" ? sub.customer : null;

        if (organizationId) {
          await sync.syncFromStripeSubscription({
            organizationId,
            stripeSubscription: sub,
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

      // Optional: invoice events (V1 ignore)
      case "invoice.payment_succeeded":
      case "invoice.payment_failed":
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
