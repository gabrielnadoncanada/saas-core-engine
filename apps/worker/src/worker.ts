/* eslint-disable no-console */
import {
  createQueue,
  createWorker,
  enqueueJob,
  type BillingWebhookDeadLetterPayload,
} from "@jobs-core";
import { getEmailService } from "../../web/src/server/services/email.service";
import { processBillingWebhookEventById } from "../../web/src/server/billing/process-billing-webhook-event";
import { BillingWebhookEventsRepo } from "../../web/src/server/db-repos/billing-webhook-events.repo";

const redisUrl = process.env.QUEUE_REDIS_URL ?? "redis://127.0.0.1:6379";
const deadLetterQueue = createQueue(redisUrl, "dead-letter");
const webhookEventsRepo = new BillingWebhookEventsRepo();

async function pushDeadLetter(data: BillingWebhookDeadLetterPayload) {
  await enqueueJob(deadLetterQueue, "billing.webhook.dead_letter", data, {
    removeOnComplete: 1000,
  });
}

const emailWorker = createWorker(redisUrl, "emails", async (name, data) => {
  if (name !== "email.org_invite.send") return;
  const mail = getEmailService();
  await mail.sendOrgInvite(data.email, data.acceptUrl, data.organizationName);
});

const billingWorker = createWorker(
  redisUrl,
  "billing-webhooks",
  async (name, data, attemptsMade) => {
    if (name !== "billing.webhook.process") return;
    const eventId = data.eventId;

    await webhookEventsRepo.markStatus({
      eventId,
      status: "processing",
      incrementDeliveryAttempts: true,
    });

    try {
      await processBillingWebhookEventById(eventId);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown_error";
      await webhookEventsRepo.markStatus({
        eventId,
        status: "failed",
        errorMessage: reason,
      });

      if (attemptsMade >= 7) {
        await pushDeadLetter({ eventId, reason });
      }
      throw error;
    }
  },
);

emailWorker.on("ready", () => console.log("[worker] emails ready"));
billingWorker.on("ready", () => console.log("[worker] billing-webhooks ready"));
emailWorker.on("failed", (job, err) =>
  console.error("[worker] email failed", job?.id, err.message),
);
billingWorker.on("failed", (job, err) =>
  console.error("[worker] billing failed", job?.id, err.message),
);

process.on("SIGINT", async () => {
  console.log("[worker] shutting down...");
  await Promise.all([emailWorker.close(), billingWorker.close(), deadLetterQueue.close()]);
  process.exit(0);
});
