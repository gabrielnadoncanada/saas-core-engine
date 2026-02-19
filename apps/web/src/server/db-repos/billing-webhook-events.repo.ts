import { prisma } from "@db";

import type {
  BillingWebhookEventsRepo as BillingWebhookEventsRepoPort,
  BillingWebhookEnvelope,
} from "@billing-core";
import type { Prisma } from "@prisma/client";


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
    event: BillingWebhookEnvelope,
    payload?: Record<string, unknown>,
  ): Promise<"created" | "duplicate"> {
    try {
      await db.billingWebhookEvent.create({
        data: {
          provider: "stripe",
          eventId: event.id,
          eventType: event.type,
          eventCreatedAt: event.createdAt,
          organizationId: event.organizationId,
          providerSubscriptionId: event.providerSubscriptionId,
          status: "received",
          payload: payload as Prisma.InputJsonValue,
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
    incrementDeliveryAttempts?: boolean;
  }): Promise<void> {
    await db.billingWebhookEvent.update({
      where: { eventId: params.eventId },
      data: {
        status: params.status,
        errorMessage: params.errorMessage ?? null,
        processedAt: new Date(),
        lastAttemptAt: new Date(),
        deliveryAttempts: params.incrementDeliveryAttempts
          ? { increment: 1 }
          : undefined,
      },
    });
  }

  async getPayloadByEventId(eventId: string): Promise<Record<string, unknown> | null> {
    const row = await prisma.billingWebhookEvent.findUnique({
      where: { eventId },
      select: { payload: true },
    });
    if (!row?.payload || typeof row.payload !== "object") return null;
    return row.payload as Record<string, unknown>;
  }

  async listReplayableFailed(limit: number): Promise<Array<{ eventId: string }>> {
    return prisma.billingWebhookEvent.findMany({
      where: { status: "failed" },
      orderBy: { receivedAt: "asc" },
      take: limit,
      select: { eventId: true },
    });
  }
}

