import { Queue, Worker, QueueEvents, type JobsOptions } from "bullmq";

export type JobName =
  | "email.org_invite.send"
  | "billing.webhook.process"
  | "billing.webhook.dead_letter";

export type EmailOrgInvitePayload = {
  email: string;
  acceptUrl: string;
  organizationName?: string;
};

export type BillingWebhookProcessPayload = {
  eventId: string;
};

export type BillingWebhookDeadLetterPayload = {
  eventId: string;
  reason: string;
};

export type QueueJobPayloadMap = {
  "email.org_invite.send": EmailOrgInvitePayload;
  "billing.webhook.process": BillingWebhookProcessPayload;
  "billing.webhook.dead_letter": BillingWebhookDeadLetterPayload;
};

export type QueueName = "emails" | "billing-webhooks" | "dead-letter";

function connection(redisUrl: string) {
  return { url: redisUrl };
}

export function createQueue(redisUrl: string, queueName: QueueName) {
  return new Queue(queueName, { connection: connection(redisUrl) });
}

export function createQueueEvents(redisUrl: string, queueName: QueueName) {
  return new QueueEvents(queueName, { connection: connection(redisUrl) });
}

export function createWorker<TName extends JobName>(
  redisUrl: string,
  queueName: QueueName,
  processor: (name: TName, data: QueueJobPayloadMap[TName], attemptsMade: number) => Promise<void>,
) {
  return new Worker(
    queueName,
    async (job) => {
      await processor(job.name as TName, job.data as QueueJobPayloadMap[TName], job.attemptsMade);
    },
    {
      connection: connection(redisUrl),
      concurrency: 5,
    },
  );
}

export async function enqueueJob<TName extends JobName>(
  queue: Queue,
  name: TName,
  data: QueueJobPayloadMap[TName],
  opts?: JobsOptions,
) {
  return queue.add(name, data, opts);
}
