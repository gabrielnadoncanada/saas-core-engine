export type BillingOrderingEvent = {
  id: string;
  type: string;
  createdAt: Date;
};

export type BillingOrderingCursor = {
  lastEventId: string;
  lastEventType: string;
  lastEventCreatedAt: Date;
};

const EVENT_PRECEDENCE: Record<string, number> = {
  "checkout.session.completed": 10,
  "customer.subscription.created": 20,
  "customer.subscription.updated": 30,
  "customer.subscription.deleted": 40,
  "invoice.payment_succeeded": 50,
  "invoice.payment_failed": 60,
};

function precedence(eventType: string): number {
  return EVENT_PRECEDENCE[eventType] ?? 0;
}

export function shouldIgnoreOutOfOrderEvent(
  cursor: BillingOrderingCursor | null,
  incoming: BillingOrderingEvent,
): boolean {
  if (!cursor) return false;

  const incomingTs = incoming.createdAt.getTime();
  const cursorTs = cursor.lastEventCreatedAt.getTime();

  if (incomingTs < cursorTs) return true;
  if (incomingTs > cursorTs) return false;

  const incomingPrecedence = precedence(incoming.type);
  const cursorPrecedence = precedence(cursor.lastEventType);

  return incomingPrecedence < cursorPrecedence;
}

export type BillingWebhookEnvelope = {
  id: string;
  type: string;
  createdAt: Date;
  organizationId: string | null;
  providerSubscriptionId: string | null;
};

export interface BillingWebhookEventsRepo {
  createReceived(
    event: BillingWebhookEnvelope,
    payload?: Record<string, unknown>,
  ): Promise<"created" | "duplicate">;
  markStatus(params: {
    eventId: string;
    status: string;
    errorMessage?: string;
    incrementDeliveryAttempts?: boolean;
  }): Promise<void>;
}

export interface BillingSubscriptionCursorRepo {
  findByProviderSubscriptionId(
    providerSubscriptionId: string,
  ): Promise<BillingOrderingCursor | null>;
  upsert(params: {
    providerSubscriptionId: string;
    lastEventCreatedAt: Date;
    lastEventId: string;
    lastEventType: string;
  }): Promise<void>;
}

export class BillingWebhookOrchestrator {
  constructor(
    private readonly events: BillingWebhookEventsRepo,
    private readonly cursors: BillingSubscriptionCursorRepo,
  ) {}

  async begin(
    event: BillingWebhookEnvelope,
  ): Promise<"process" | "duplicate" | "ignored"> {
    const created = await this.events.createReceived(event);
    if (created === "duplicate") return "duplicate";

    if (event.providerSubscriptionId) {
      const cursor = await this.cursors.findByProviderSubscriptionId(
        event.providerSubscriptionId,
      );
      if (
        shouldIgnoreOutOfOrderEvent(cursor, {
          id: event.id,
          type: event.type,
          createdAt: event.createdAt,
        })
      ) {
        await this.events.markStatus({
          eventId: event.id,
          status: "ignored_out_of_order",
        });
        return "ignored";
      }
    }

    return "process";
  }

  async complete(event: BillingWebhookEnvelope): Promise<void> {
    if (event.providerSubscriptionId) {
      await this.cursors.upsert({
        providerSubscriptionId: event.providerSubscriptionId,
        lastEventCreatedAt: event.createdAt,
        lastEventId: event.id,
        lastEventType: event.type,
      });
    }

    await this.events.markStatus({
      eventId: event.id,
      status: "processed",
    });
  }

  async fail(eventId: string, errorMessage?: string): Promise<void> {
    await this.events.markStatus({
      eventId,
      status: "failed",
      errorMessage,
    });
  }
}
