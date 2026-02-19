/* eslint-disable no-console */
import { BillingWebhookEventsRepo } from "../../apps/web/src/server/db-repos/billing-webhook-events.repo";
import { enqueueBillingWebhookProcess } from "../../apps/web/src/server/jobs/queues";

async function run() {
  const limit = Math.max(1, Number(process.argv[2] ?? "100"));
  const repo = new BillingWebhookEventsRepo();
  const failed = await repo.listReplayableFailed(limit);

  if (failed.length === 0) {
    console.log("No failed webhook events to replay.");
    return;
  }

  for (const row of failed) {
    await enqueueBillingWebhookProcess({ eventId: row.eventId });
    await repo.markStatus({
      eventId: row.eventId,
      status: "queued",
      errorMessage: "replayed_via_cli",
    });
    console.log(`Requeued ${row.eventId}`);
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : "webhook replay failed");
  process.exit(1);
});
