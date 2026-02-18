import { prisma } from "@db";
import type {
  BillingWebhookEventsRepo as BillingWebhookEventsRepoPort,
  StripeWebhookEnvelope,
} from "@billing-core";

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  return code === "P2002";
}

const db = prisma as typeof prisma & {
  billingWebhookEvent: {
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
  };
};

export class BillingWebhookEventsRepo implements BillingWebhookEventsRepoPort {
  async createReceived(
    event: StripeWebhookEnvelope,
  ): Promise<"created" | "duplicate"> {
    try {
      await db.billingWebhookEvent.create({
        data: {
          provider: "stripe",
          eventId: event.id,
          eventType: event.type,
          eventCreatedAt: event.createdAt,
          organizationId: event.organizationId,
          stripeSubscriptionId: event.stripeSubscriptionId,
          status: "received",
        },
      });
      return "created";
    } catch (error) {
      if (isUniqueConstraintViolation(error)) return "duplicate";
      throw error;
    }
  }

  async markStatus(params: {
    eventId: string;
    status: string;
    errorMessage?: string;
  }): Promise<void> {
    await db.billingWebhookEvent.update({
      where: { eventId: params.eventId },
      data: {
        status: params.status,
        errorMessage: params.errorMessage ?? null,
        processedAt: new Date(),
      },
    });
  }
}

