import { prisma } from "@db";
import type {
  BillingSubscriptionCursorRepo as BillingSubscriptionCursorRepoPort,
  StripeOrderingCursor,
} from "@billing-core";

const db = prisma as typeof prisma & {
  billingSubscriptionCursor: {
    findUnique: (args: unknown) => Promise<{
      lastEventCreatedAt: Date;
      lastEventId: string;
      lastEventType: string;
    } | null>;
    upsert: (args: unknown) => Promise<unknown>;
  };
};

export class BillingSubscriptionCursorsRepo
  implements BillingSubscriptionCursorRepoPort
{
  async findByStripeSubscriptionId(
    stripeSubscriptionId: string,
  ): Promise<StripeOrderingCursor | null> {
    const cursor = await db.billingSubscriptionCursor.findUnique({
      where: { stripeSubscriptionId },
    });
    if (!cursor) return null;
    return {
      lastEventCreatedAt: cursor.lastEventCreatedAt,
      lastEventId: cursor.lastEventId,
      lastEventType: cursor.lastEventType,
    };
  }

  async upsert(params: {
    stripeSubscriptionId: string;
    lastEventCreatedAt: Date;
    lastEventId: string;
    lastEventType: string;
  }): Promise<void> {
    await db.billingSubscriptionCursor.upsert({
      where: { stripeSubscriptionId: params.stripeSubscriptionId },
      create: {
        stripeSubscriptionId: params.stripeSubscriptionId,
        lastEventCreatedAt: params.lastEventCreatedAt,
        lastEventId: params.lastEventId,
        lastEventType: params.lastEventType,
      },
      update: {
        lastEventCreatedAt: params.lastEventCreatedAt,
        lastEventId: params.lastEventId,
        lastEventType: params.lastEventType,
      },
    });
  }
}

