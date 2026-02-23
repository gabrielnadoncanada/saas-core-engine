import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrgCoreError } from "@org-core";

const acceptInvite = vi.fn();
const getSessionUser = vi.fn();

vi.mock("@/server/adapters/core/org-core.adapter", () => ({
  createInviteService: () => ({
    acceptInvite,
  }),
}));

vi.mock("@/server/auth/require-user", () => ({
  getSessionUser,
}));

vi.mock("@/server/telemetry/otel", () => ({
  withApiTelemetry: async (_req: Request, _route: string, handler: () => Promise<Response>) =>
    handler(),
}));

describe("GET /api/org/invite/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to invalid when token is missing", async () => {
    const { GET } = await import("../../../../../../app/api/org/invite/accept/route");
    const res = await GET(new Request("http://localhost/api/org/invite/accept"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost/dashboard/team?invite=invalid",
    );
  });

  it("redirects to invited signup when user is not authenticated", async () => {
    getSessionUser.mockRejectedValueOnce(new Error("no session"));

    const { GET } = await import("../../../../../../app/api/org/invite/accept/route");
    const res = await GET(
      new Request("http://localhost/api/org/invite/accept?token=tok-123"),
    );

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost/signup?invite=tok-123&redirect=%2Fapi%2Forg%2Finvite%2Faccept%3Ftoken%3Dtok-123",
    );
    expect(acceptInvite).not.toHaveBeenCalled();
  });

  it("accepts invite and redirects to success", async () => {
    getSessionUser.mockResolvedValueOnce({ userId: "u1" });
    acceptInvite.mockResolvedValueOnce({ organizationId: "org1" });

    const { GET } = await import("../../../../../../app/api/org/invite/accept/route");
    const res = await GET(
      new Request("http://localhost/api/org/invite/accept?token=tok-123"),
    );

    expect(acceptInvite).toHaveBeenCalledWith({
      token: "tok-123",
      acceptUserId: "u1",
    });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("maps org-core errors to invite status query", async () => {
    getSessionUser.mockResolvedValueOnce({ userId: "u1" });
    acceptInvite.mockRejectedValueOnce(
      new OrgCoreError("invite_email_mismatch", "mismatch"),
    );

    const { GET } = await import("../../../../../../app/api/org/invite/accept/route");
    const res = await GET(
      new Request("http://localhost/api/org/invite/accept?token=tok-123"),
    );

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost/dashboard/team?invite=email_mismatch",
    );
  });

  it("maps invite_expired to expired status query", async () => {
    getSessionUser.mockResolvedValueOnce({ userId: "u1" });
    acceptInvite.mockRejectedValueOnce(new OrgCoreError("invite_expired", "expired"));

    const { GET } = await import("../../../../../../app/api/org/invite/accept/route");
    const res = await GET(
      new Request("http://localhost/api/org/invite/accept?token=tok-123"),
    );

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost/dashboard/team?invite=expired",
    );
  });
});
