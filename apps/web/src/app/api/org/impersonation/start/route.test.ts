import { beforeEach, describe, expect, it, vi } from "vitest";

const withRequiredOrgScope = vi.fn();
const startImpersonation = vi.fn();
const setImpersonationCookie = vi.fn();
const logOrgAudit = vi.fn();
const extractClientIp = vi.fn();

vi.mock("@/server/auth/with-org-scope", () => ({
  withRequiredOrgScope,
}));

vi.mock("@/server/services/impersonation.service", () => ({
  startImpersonation,
}));

vi.mock("@/server/adapters/cookies/session-cookie.adapter", () => ({
  setImpersonationCookie,
}));

vi.mock("@/server/services/org-audit.service", () => ({
  logOrgAudit,
}));

vi.mock("@/server/http/request-ip", () => ({
  extractClientIp,
}));

vi.mock("@/server/telemetry/otel", () => ({
  withApiTelemetry: async (_req: Request, _route: string, handler: () => Promise<Response>) =>
    handler(),
  getActiveTraceContext: () => ({ traceId: "trace-1", spanId: "span-1" }),
}));

describe("POST /api/org/impersonation/start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRequiredOrgScope.mockImplementation(async ({ run }: any) =>
      run({ userId: "actor-1", organizationId: "org1", role: "owner" }),
    );
    extractClientIp.mockReturnValue("127.0.0.1");
    logOrgAudit.mockResolvedValue(undefined);
    startImpersonation.mockResolvedValue({
      token: "tok-1",
      session: { id: "imp-1" },
      target: { userId: "member-1", role: "member" },
    });
  });

  it("returns 400 for invalid input", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/org/impersonation/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetUserId: "" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("blocks owner impersonation", async () => {
    const { OrgCoreError } = await import("@org-core");
    startImpersonation.mockRejectedValueOnce(
      new OrgCoreError("forbidden", "blocked", {
        reason: "target_owner_blocked",
      }),
    );

    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/org/impersonation/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetUserId: "owner-1" }),
      }),
    );
    const json = (await res.json()) as { error: string };

    expect(res.status).toBe(403);
    expect(json.error).toBe("forbidden");
    expect(logOrgAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "forbidden",
      }),
    );
  });

  it("starts impersonation and sets cookie", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/org/impersonation/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetUserId: "member-1" }),
      }),
    );
    const json = (await res.json()) as {
      ok: boolean;
      impersonation: { sessionId: string; targetUserId: string };
    };

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.impersonation.sessionId).toBe("imp-1");
    expect(setImpersonationCookie).toHaveBeenCalledWith("tok-1");
  });
});
