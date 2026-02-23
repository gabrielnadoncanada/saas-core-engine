import { beforeEach, describe, expect, it, vi } from "vitest";

const getInviteForToken = vi.fn();

vi.mock("@/server/adapters/core/org-core.adapter", () => ({
  createInviteService: () => ({
    getInviteForToken,
  }),
}));

vi.mock("@/server/telemetry/otel", () => ({
  withApiTelemetry: async (_req: Request, _route: string, handler: () => Promise<Response>) =>
    handler(),
}));

describe("GET /api/org/invite/token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when token is missing", async () => {
    const { GET } = await import("../../../../../../app/api/org/invite/token/route");
    const res = await GET(new Request("http://localhost/api/org/invite/token"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid_invite" });
  });

  it("returns invite payload when token is pending", async () => {
    getInviteForToken.mockResolvedValueOnce({
      status: "pending",
      invite: {
        email: "member@example.com",
        role: "member",
        organizationId: "org1",
        expiresAt: new Date("2026-03-01T00:00:00.000Z"),
      },
    });

    const { GET } = await import("../../../../../../app/api/org/invite/token/route");
    const res = await GET(
      new Request("http://localhost/api/org/invite/token?token=tok-123"),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      invite: {
        email: "member@example.com",
        role: "member",
        organizationId: "org1",
        expiresAt: "2026-03-01T00:00:00.000Z",
      },
    });
  });

  it("maps expired invite to explicit error", async () => {
    getInviteForToken.mockResolvedValueOnce({ status: "expired" });

    const { GET } = await import("../../../../../../app/api/org/invite/token/route");
    const res = await GET(
      new Request("http://localhost/api/org/invite/token?token=tok-123"),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invite_expired" });
  });
});
