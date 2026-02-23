import { beforeEach, describe, expect, it, vi } from "vitest";

const createPortalSession = vi.fn();
const requireOrgContext = vi.fn();

vi.mock("@/server/adapters/core/billing-core.adapter", () => ({
  createBillingSessionService: () => ({
    createPortalSession,
  }),
}));

vi.mock("@/server/auth/require-org", () => ({
  requireOrgContext,
}));

vi.mock("@/server/config/env", () => ({
  env: {
    APP_URL: "http://localhost:3000",
  },
}));

vi.mock("@/server/telemetry/otel", () => ({
  withApiTelemetry: async (_req: Request, _route: string, handler: () => Promise<Response>) =>
    handler(),
}));

describe("POST /api/billing/portal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireOrgContext.mockResolvedValue({ organizationId: "org1" });
  });

  it("returns 400 when organization has no billing customer", async () => {
    createPortalSession.mockResolvedValueOnce(null);

    const { POST } = await import("@/app/api/billing/portal/route");
    const res = await POST(
      new Request("http://localhost/api/billing/portal", {
        method: "POST",
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "No billing customer" });
  });

  it("returns Stripe customer portal URL", async () => {
    createPortalSession.mockResolvedValueOnce({ url: "https://billing.stripe.test/portal_1" });

    const { POST } = await import("@/app/api/billing/portal/route");
    const res = await POST(
      new Request("http://localhost/api/billing/portal", {
        method: "POST",
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      url: "https://billing.stripe.test/portal_1",
    });
    expect(createPortalSession).toHaveBeenCalledWith({
      organizationId: "org1",
      returnUrl: "http://localhost:3000/dashboard/billing",
    });
  });
});
