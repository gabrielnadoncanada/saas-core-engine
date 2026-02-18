export type StripeOrderingEvent = {
  id: string;
  type: string;
  createdAt: Date;
};

export type StripeOrderingCursor = {
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
  cursor: StripeOrderingCursor | null,
  incoming: StripeOrderingEvent,
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

export type StripeWebhookEnvelope = {
  id: string;
  type: string;
  createdAt: Date;
  organizationId: string | null;
  stripeSubscriptionId: string | null;
};

export interface BillingWebhookEventsRepo {
  createReceived(event: StripeWebhookEnvelope): Promise<"created" | "duplicate">;
  markStatus(params: {
    eventId: string;
    status: string;
    errorMessage?: string;
  }): Promise<void>;
}

export interface BillingSubscriptionCursorRepo {
  findByStripeSubscriptionId(
    stripeSubscriptionId: string,
  ): Promise<StripeOrderingCursor | null>;
  upsert(params: {
    stripeSubscriptionId: string;
    lastEventCreatedAt: Date;
    lastEventId: string;
    lastEventType: string;
  }): Promise<void>;
}

export class StripeWebhookOrchestrator {
  constructor(
    private readonly events: BillingWebhookEventsRepo,
    private readonly cursors: BillingSubscriptionCursorRepo,
  ) {}

  async begin(
    event: StripeWebhookEnvelope,
  ): Promise<"process" | "duplicate" | "ignored"> {
    const created = await this.events.createReceived(event);
    if (created === "duplicate") return "duplicate";

    if (event.stripeSubscriptionId) {
      const cursor = await this.cursors.findByStripeSubscriptionId(
        event.stripeSubscriptionId,
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

  async complete(event: StripeWebhookEnvelope): Promise<void> {
    if (event.stripeSubscriptionId) {
      await this.cursors.upsert({
        stripeSubscriptionId: event.stripeSubscriptionId,
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

