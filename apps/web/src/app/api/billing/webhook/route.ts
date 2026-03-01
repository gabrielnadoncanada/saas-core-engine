import {
  billingEventCreatedAt,
  extractBillingSubscriptionId,
  extractOrganizationId,
} from "@billing-core";
import { prisma } from "@db";
import { NextResponse } from "next/server";

import type Stripe from "stripe";

import { createBillingWebhookOrchestrator } from "@/server/adapters/core/billing-core.adapter";
import { processStripeEvent } from "@/server/billing/process-billing-webhook-event";
import { env } from "@/server/config/env";
import { incrementMetric } from "@/server/metrics/metrics";
import { stripe } from "@/server/services/stripe.service";
import { withApiTelemetry } from "@/server/telemetry/otel";

function constructStripeEvent(
  s: ReturnType<typeof stripe>,
  body: string,
  signature: string,
): Stripe.Event | null {
  try {
    return s.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  return withApiTelemetry(req, "/api/billing/webhook", async () => {
    if (!env.BILLING_ENABLED) {
      return NextResponse.json({ ok: false, error: "billing_disabled" }, { status: 404 });
    }
    const sig = req.headers.get("stripe-signature");
    if (!sig) return NextResponse.json({ ok: false }, { status: 400 });

    const body = await req.text();
    const s = stripe();

    const event = constructStripeEvent(s, body, sig);
    if (!event) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const orchestrator = createBillingWebhookOrchestrator();

    const envelope = {
      id: event.id,
      type: event.type,
      createdAt: billingEventCreatedAt(event),
      organizationId: extractOrganizationId(event),
      providerSubscriptionId: extractBillingSubscriptionId(event),
    };

    const rawPayload = JSON.parse(body) as Record<string, unknown>;
    const decision = await orchestrator.begin(envelope, rawPayload);
    if (decision !== "process") {
      if (decision === "duplicate") incrementMetric("billing_webhook_duplicate_total");
      if (decision === "ignored") incrementMetric("billing_webhook_ignored_total");
      return NextResponse.json({ received: true, [decision]: true });
    }

    try {
      await processStripeEvent(event);
      await orchestrator.complete(envelope);
      incrementMetric("billing_webhook_processed_total");
      return NextResponse.json({ received: true, processed: true });
    } catch (error) {
      await orchestrator.fail(
        event.id,
        error instanceof Error ? error.message : "webhook_processing_failed",
      );
      if (envelope.organizationId) {
        await prisma.subscription.updateMany({
          where: { organizationId: envelope.organizationId },
          data: { needsReconcile: true },
        });
      }
      incrementMetric("billing_webhook_failed_total");
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  });
}
