import { beforeEach, describe, expect, it, vi } from "vitest";

const constructEvent = vi.fn();
const orchestratorBegin = vi.fn();
const orchestratorComplete = vi.fn();
const orchestratorFail = vi.fn();
const processStripeEvent = vi.fn();

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

vi.mock("@/server/adapters/core/billing-core.adapter", () => ({
  createBillingWebhookOrchestrator: () => ({
    begin: orchestratorBegin,
    complete: orchestratorComplete,
    fail: orchestratorFail,
  }),
}));

vi.mock("@/server/billing/process-billing-webhook-event", () => ({
  processStripeEvent,
}));

vi.mock("@/server/telemetry/otel", () => ({
  withApiTelemetry: async (_req: Request, _route: string, handler: () => Promise<Response>) =>
    handler(),
}));

const fakeEvent = {
  id: "evt_1",
  type: "invoice.payment_succeeded",
  created: 1_700_000_000,
  data: { object: {} },
};

describe("POST /api/billing/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orchestratorBegin.mockResolvedValue("process");
    orchestratorComplete.mockResolvedValue(undefined);
    orchestratorFail.mockResolvedValue(undefined);
    processStripeEvent.mockResolvedValue(undefined);
    constructEvent.mockReturnValue(fakeEvent);
  });

  it("returns duplicate=true when orchestrator detects duplicate", async () => {
    orchestratorBegin.mockResolvedValueOnce("duplicate");

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
    expect(processStripeEvent).not.toHaveBeenCalled();
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
    expect(processStripeEvent).not.toHaveBeenCalled();
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
    expect(processStripeEvent).not.toHaveBeenCalled();
  });

  it("processes event via orchestrator", async () => {
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
    expect(processStripeEvent).toHaveBeenCalledWith(fakeEvent);
    expect(orchestratorComplete).toHaveBeenCalled();
  });

  it("calls orchestrator.fail when processing throws", async () => {
    processStripeEvent.mockRejectedValueOnce(new Error("boom"));

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
    expect(orchestratorFail).toHaveBeenCalledWith("evt_1", "boom");
  });

  it("returns ignored=true when orchestrator detects out-of-order", async () => {
    orchestratorBegin.mockResolvedValueOnce("ignored");

    const { POST } = await import("../../../../../app/api/billing/webhook/route");
    const res = await POST(
      new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        headers: { "stripe-signature": "sig" },
        body: "{}",
      }),
    );
    const json = (await res.json()) as { ignored?: boolean; received?: boolean };

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);
    expect(json.ignored).toBe(true);
    expect(processStripeEvent).not.toHaveBeenCalled();
  });
});
