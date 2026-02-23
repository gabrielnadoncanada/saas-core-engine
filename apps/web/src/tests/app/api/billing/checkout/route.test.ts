import { beforeEach, describe, expect, it, vi } from "vitest";

const createCheckoutSession = vi.fn();
const requireOrgContext = vi.fn();

vi.mock("@/server/adapters/core/billing-core.adapter", () => ({
  createBillingSessionService: () => ({
    createCheckoutSession,
  }),
}));

vi.mock("@/server/auth/require-org", () => ({
  requireOrgContext,
}));

vi.mock("@/server/config/env", () => ({
  env: {
    STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
    STRIPE_SUCCESS_URL: "http://localhost/dashboard/billing?success=1",
    STRIPE_CANCEL_URL: "http://localhost/dashboard/billing?canceled=1",
  },
}));

vi.mock("@/server/telemetry/otel", () => ({
  withApiTelemetry: async (_req: Request, _route: string, handler: () => Promise<Response>) =>
    handler(),
}));

describe("POST /api/billing/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireOrgContext.mockResolvedValue({ organizationId: "org1" });
  });

  it("returns 400 for invalid plan", async () => {
    const { POST } = await import("@/app/api/billing/checkout/route");
    const res = await POST(
      new Request("http://localhost/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: "free" }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Invalid plan" });
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it("creates Stripe checkout session for pro plan", async () => {
    createCheckoutSession.mockResolvedValueOnce({ url: "https://checkout.stripe.test/session_1" });

    const { POST } = await import("@/app/api/billing/checkout/route");
    const res = await POST(
      new Request("http://localhost/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: "pro" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      url: "https://checkout.stripe.test/session_1",
    });
    expect(createCheckoutSession).toHaveBeenCalledWith({
      organizationId: "org1",
      priceId: "price_pro_monthly",
      successUrl: "http://localhost/dashboard/billing?success=1",
      cancelUrl: "http://localhost/dashboard/billing?canceled=1",
    });
  });
});
