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
