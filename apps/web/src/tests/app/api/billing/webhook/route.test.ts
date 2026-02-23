import { beforeEach, describe, expect, it, vi } from "vitest";

const constructEvent = vi.fn();
const createReceived = vi.fn();
const markStatus = vi.fn();
const processBillingWebhookEventById = vi.fn();

vi.mock("@/server/services/stripe.service", () => ({
  stripe: () => ({
    webhooks: {
      constructEvent,
    },
  }),
}));

vi.mock("@/server/config/env", () => ({
  env: {
    STRIPE_WEBHOOK_SECRET: "whsec_test",
  },
}));

vi.mock("@/server/db-repos/billing-webhook-events.repo", () => ({
  BillingWebhookEventsRepo: class {
    createReceived = createReceived;
    markStatus = markStatus;
  },
}));

vi.mock("@/server/billing/process-billing-webhook-event", () => ({
  processBillingWebhookEventById,
}));

vi.mock("@/server/telemetry/otel", () => ({
  withApiTelemetry: async (_req: Request, _route: string, handler: () => Promise<Response>) =>
    handler(),
}));

describe("POST /api/billing/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createReceived.mockResolvedValue("created");
    markStatus.mockResolvedValue(undefined);
    processBillingWebhookEventById.mockResolvedValue("processed");
    constructEvent.mockReturnValue({
      id: "evt_1",
      type: "invoice.payment_succeeded",
      created: 1_700_000_000,
      data: { object: {} },
    });
  });

  it("returns duplicate=true when event already exists", async () => {
    createReceived.mockResolvedValueOnce("duplicate");

    const { POST } = await import("../../../../../app/api/billing/webhook/route");
    const res = await POST(
      new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        headers: { "stripe-signature": "sig" },
        body: "{}",
      }),
    );
    const json = (await res.json()) as { duplicate?: boolean; received?: boolean };

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);
    expect(json.duplicate).toBe(true);
    expect(processBillingWebhookEventById).not.toHaveBeenCalled();
  });

  it("returns 400 when stripe signature header is missing", async () => {
    const { POST } = await import("../../../../../app/api/billing/webhook/route");
    const res = await POST(
      new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        body: "{}",
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false });
    expect(processBillingWebhookEventById).not.toHaveBeenCalled();
  });

  it("returns 400 when signature verification fails", async () => {
    constructEvent.mockImplementationOnce(() => {
      throw new Error("bad sig");
    });

    const { POST } = await import("../../../../../app/api/billing/webhook/route");
    const res = await POST(
      new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        headers: { "stripe-signature": "sig" },
        body: "{}",
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false });
    expect(processBillingWebhookEventById).not.toHaveBeenCalled();
  });

  it("processes event synchronously", async () => {
    const { POST } = await import("../../../../../app/api/billing/webhook/route");
    const res = await POST(
      new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        headers: { "stripe-signature": "sig" },
        body: "{}",
      }),
    );
    const json = (await res.json()) as { processed?: boolean; received?: boolean };

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);
    expect(json.processed).toBe(true);
    expect(processBillingWebhookEventById).toHaveBeenCalledWith("evt_1");
  });

  it("marks event as failed when processing throws", async () => {
    processBillingWebhookEventById.mockRejectedValueOnce(new Error("boom"));

    const { POST } = await import("../../../../../app/api/billing/webhook/route");
    const res = await POST(
      new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        headers: { "stripe-signature": "sig" },
        body: "{}",
      }),
    );

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false });
    expect(markStatus).toHaveBeenCalledWith({
      eventId: "evt_1",
      status: "failed",
      errorMessage: "boom",
    });
  });
});
