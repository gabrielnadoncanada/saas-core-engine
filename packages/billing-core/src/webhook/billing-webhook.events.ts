type BillingProviderEvent = {
  created: number;
  type: string;
  data: {
    object: unknown;
  };
};

export function billingEventCreatedAt(event: BillingProviderEvent): Date {
  return new Date(event.created * 1000);
}

export function extractBillingSubscriptionId(event: BillingProviderEvent): string | null {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as { subscription?: unknown };
      return typeof session.subscription === "string" ? session.subscription : null;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created":
    case "customer.subscription.deleted": {
      const sub = event.data.object as { id?: unknown };
      return typeof sub.id === "string" ? sub.id : null;
    }
    default:
      return null;
  }
}

export function extractOrganizationId(event: BillingProviderEvent): string | null {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as {
        metadata?: Record<string, string | undefined> | null;
      };
      return session.metadata?.["organizationId"] ?? null;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created":
    case "customer.subscription.deleted": {
      const sub = event.data.object as {
        metadata?: Record<string, string | undefined> | null;
      };
      return sub.metadata?.["organizationId"] ?? null;
    }
    default:
      return null;
  }
}
