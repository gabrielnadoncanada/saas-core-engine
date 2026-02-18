import { beforeEach, describe, expect, it, vi } from "vitest";

const constructEvent = vi.fn();
const retrieveSubscription = vi.fn();

const billingWebhookEventCreate = vi.fn();
const billingWebhookEventUpdate = vi.fn();
const billingCursorFindUnique = vi.fn();
const billingCursorUpsert = vi.fn();
const subscriptionUpsert = vi.fn();

const syncFromProviderSubscription = vi.fn();
const markCanceled = vi.fn();
const mapStripeSubscriptionToSnapshot = vi.fn();
const orchestratorBegin = vi.fn();
const orchestratorComplete = vi.fn();
const orchestratorFail = vi.fn();

vi.mock("@/server/services/stripe.service", () => ({
  stripe: () => ({
    webhooks: {
      constructEvent,
    },
    subscriptions: {
      retrieve: retrieveSubscription,
    },
  }),
}));

vi.mock("@/server/config/env", () => ({
  env: {
    STRIPE_WEBHOOK_SECRET: "whsec_test",
    STRIPE_PRICE_PRO_MONTHLY: "price_pro",
  },
}));

vi.mock("@db", () => ({
  prisma: {
    billingWebhookEvent: {
      create: billingWebhookEventCreate,
      update: billingWebhookEventUpdate,
    },
    billingSubscriptionCursor: {
      findUnique: billingCursorFindUnique,
      upsert: billingCursorUpsert,
    },
    subscription: {
      upsert: subscriptionUpsert,
    },
  },
}));

vi.mock("@/server/adapters/core/billing-core.adapter", () => ({
  createSubscriptionSyncService: () => ({
    syncFromProviderSubscription,
    markCanceled,
  }),
  createStripeWebhookOrchestrator: () => ({
    begin: orchestratorBegin,
    complete: orchestratorComplete,
    fail: orchestratorFail,
  }),
}));

vi.mock("@/server/adapters/stripe/stripe-webhook.adapter", () => ({
  mapStripeSubscriptionToSnapshot,
}));

describe("POST /api/billing/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    billingWebhookEventCreate.mockResolvedValue(undefined);
    billingWebhookEventUpdate.mockResolvedValue(undefined);
    billingCursorFindUnique.mockResolvedValue(null);
    billingCursorUpsert.mockResolvedValue(undefined);
    subscriptionUpsert.mockResolvedValue(undefined);
    syncFromProviderSubscription.mockResolvedValue(undefined);
    markCanceled.mockResolvedValue(undefined);
    mapStripeSubscriptionToSnapshot.mockReturnValue({
      id: "sub_1",
      status: "active",
      priceId: "price_pro",
      currentPeriodEndUnix: 1_700_000_000,
    });
    orchestratorBegin.mockResolvedValue("process");
    orchestratorComplete.mockResolvedValue(undefined);
    orchestratorFail.mockResolvedValue(undefined);
    retrieveSubscription.mockResolvedValue({
      id: "sub_1",
      status: "active",
      items: { data: [{ price: { id: "price_pro" } }] },
      current_period_end: 1_700_000_000,
    });
  });

  it("returns duplicate=true when event id already exists", async () => {
    constructEvent.mockReturnValue({
      id: "evt_dup",
      type: "invoice.payment_succeeded",
      created: 1_700_000_000,
      data: { object: {} },
    });
    orchestratorBegin.mockResolvedValueOnce("duplicate");

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/billing/webhook", {
      method: "POST",
      headers: { "stripe-signature": "sig" },
      body: "{}",
    });

    const res = await POST(req);
    const json = (await res.json()) as { duplicate?: boolean; received?: boolean };

    expect(res.status).toBe(200);
    expect(json.duplicate).toBe(true);
    expect(json.received).toBe(true);
  });

  it("ignores out-of-order event by cursor", async () => {
    constructEvent.mockReturnValue({
      id: "evt_old",
      type: "customer.subscription.created",
      created: 1_700_000_000,
      data: {
        object: {
          id: "sub_1",
          metadata: { organizationId: "org_1" },
          customer: "cus_1",
        },
      },
    });

    orchestratorBegin.mockResolvedValueOnce("ignored");

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/billing/webhook", {
      method: "POST",
      headers: { "stripe-signature": "sig" },
      body: "{}",
    });

    const res = await POST(req);
    const json = (await res.json()) as { ignored?: boolean; received?: boolean };

    expect(res.status).toBe(200);
    expect(json.ignored).toBe(true);
    expect(syncFromProviderSubscription).not.toHaveBeenCalled();
  });

});
