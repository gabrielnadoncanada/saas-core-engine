import { createQueue, enqueueJob } from "@jobs-core";
import { env } from "@/server/config/env";

type QueueInstance = ReturnType<typeof createQueue>;

let emailQueue: QueueInstance | null = null;
let billingWebhookQueue: QueueInstance | null = null;

function ensureEnabled() {
  if (!env.QUEUE_ENABLED) {
    throw new Error("QUEUE_DISABLED");
  }
}

function getEmailQueue() {
  ensureEnabled();
  if (!emailQueue) {
    emailQueue = createQueue(env.QUEUE_REDIS_URL, "emails");
  }
  return emailQueue;
}

function getBillingWebhookQueue() {
  ensureEnabled();
  if (!billingWebhookQueue) {
    billingWebhookQueue = createQueue(env.QUEUE_REDIS_URL, "billing-webhooks");
  }
  return billingWebhookQueue;
}

export async function enqueueOrgInviteEmail(params: {
  email: string;
  acceptUrl: string;
  organizationName?: string;
}) {
  const queue = getEmailQueue();
  await enqueueJob(queue, "email.org_invite.send", params, {
    removeOnComplete: 200,
    attempts: 5,
    backoff: { type: "exponential", delay: 1000 },
  });
}

export async function enqueueBillingWebhookProcess(params: { eventId: string }) {
  const queue = getBillingWebhookQueue();
  await enqueueJob(queue, "billing.webhook.process", params, {
    jobId: params.eventId,
    removeOnComplete: 500,
    attempts: 8,
    backoff: { type: "exponential", delay: 2000 },
  });
}
