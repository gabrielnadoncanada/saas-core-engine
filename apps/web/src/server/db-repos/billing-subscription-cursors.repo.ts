import { prisma } from "@db";
import type {
  BillingSubscriptionCursorRepo as BillingSubscriptionCursorRepoPort,
  BillingOrderingCursor,
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
  async findByProviderSubscriptionId(
    providerSubscriptionId: string,
  ): Promise<BillingOrderingCursor | null> {
    const cursor = await db.billingSubscriptionCursor.findUnique({
      where: { providerSubscriptionId },
    });
    if (!cursor) return null;
    return {
      lastEventCreatedAt: cursor.lastEventCreatedAt,
      lastEventId: cursor.lastEventId,
      lastEventType: cursor.lastEventType,
    };
  }

  async upsert(params: {
    providerSubscriptionId: string;
    lastEventCreatedAt: Date;
    lastEventId: string;
    lastEventType: string;
  }): Promise<void> {
    await db.billingSubscriptionCursor.upsert({
      where: { providerSubscriptionId: params.providerSubscriptionId },
      create: {
        providerSubscriptionId: params.providerSubscriptionId,
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

