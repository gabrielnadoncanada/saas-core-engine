import {
  billingEventCreatedAt,
  extractBillingSubscriptionId,
  extractOrganizationId,
} from "@billing-core";
import { NextResponse } from "next/server";

import type Stripe from "stripe";

import { env } from "@/server/config/env";
import { BillingWebhookEventsRepo } from "@/server/db-repos/billing-webhook-events.repo";
import { enqueueBillingWebhookProcess } from "@/server/jobs/queues";
import { stripe } from "@/server/services/stripe.service";
import { withApiTelemetry } from "@/server/telemetry/otel";

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

    const eventsRepo = new BillingWebhookEventsRepo();
    const providerSubscriptionId = extractBillingSubscriptionId(event);
    const organizationId = extractOrganizationId(event);
    const createdAt = billingEventCreatedAt(event);

    const created = await eventsRepo.createReceived(
      {
        id: event.id,
        type: event.type,
        createdAt,
        organizationId,
        providerSubscriptionId,
      },
      event as unknown as Record<string, unknown>,
    );

    if (created === "duplicate") {
      return NextResponse.json({ received: true, duplicate: true });
    }

    try {
      await enqueueBillingWebhookProcess({ eventId: event.id });
      await eventsRepo.markStatus({ eventId: event.id, status: "queued" });
      return NextResponse.json({ received: true, queued: true });
    } catch (error) {
      await eventsRepo.markStatus({
        eventId: event.id,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "queue_enqueue_failed",
      });
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  });
}
