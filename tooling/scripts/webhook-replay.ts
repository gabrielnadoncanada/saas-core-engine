/* eslint-disable no-console */
import { BillingWebhookEventsRepo } from "../../apps/web/src/server/db-repos/billing-webhook-events.repo";
import { processStripeEvent } from "../../apps/web/src/server/billing/process-billing-webhook-event";

import type Stripe from "stripe";

async function run() {
  const limit = Math.max(1, Number(process.argv[2] ?? "100"));
  const repo = new BillingWebhookEventsRepo();
  const failed = await repo.listReplayableFailed(limit);

  if (failed.length === 0) {
    console.log("No failed webhook events to replay.");
    return;
  }

  for (const row of failed) {
    const payload = await repo.getPayloadByEventId(row.eventId);
    if (!payload) {
      console.warn(`Skipping ${row.eventId}: no payload found`);
      continue;
    }

    // Replay uses stored raw payload — acceptable cast for CLI replay only
    await processStripeEvent(payload as unknown as Stripe.Event);
    await repo.markStatus({
      eventId: row.eventId,
      status: "processed",
      errorMessage: "replayed_via_cli",
    });
    console.log(`Processed ${row.eventId}`);
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : "webhook replay failed");
  process.exit(1);
});
