import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const getImpersonationTokenFromCookie = vi.fn();
const clearImpersonationCookie = vi.fn();
const stopImpersonation = vi.fn();
const logOrgAudit = vi.fn();
const extractClientIp = vi.fn();

vi.mock("@/server/auth/require-user", () => ({
  requireUser,
}));

vi.mock("@/server/adapters/cookies/session-cookie.adapter", () => ({
  getImpersonationTokenFromCookie,
  clearImpersonationCookie,
}));

vi.mock("@/server/services/impersonation.service", () => ({
  stopImpersonation,
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

describe("POST /api/org/impersonation/stop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({
      userId: "actor-1",
      organizationId: "org1",
      impersonation: {
        actorUserId: "actor-1",
        targetUserId: "target-1",
      },
    });
    clearImpersonationCookie.mockResolvedValue(undefined);
    logOrgAudit.mockResolvedValue(undefined);
    extractClientIp.mockReturnValue("127.0.0.1");
  });

  it("returns stopped=false when no cookie token", async () => {
    getImpersonationTokenFromCookie.mockResolvedValueOnce(null);
    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/api/org/impersonation/stop", { method: "POST" }));
    const json = (await res.json()) as { stopped: boolean };

    expect(res.status).toBe(200);
    expect(json.stopped).toBe(false);
    expect(clearImpersonationCookie).toHaveBeenCalled();
  });

  it("stops impersonation and audits", async () => {
    getImpersonationTokenFromCookie.mockResolvedValueOnce("tok-1");
    stopImpersonation.mockResolvedValueOnce({
      id: "imp-1",
      organizationId: "org1",
      actorUserId: "actor-1",
      targetUserId: "target-1",
    });

    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/api/org/impersonation/stop", { method: "POST" }));
    const json = (await res.json()) as { stopped: boolean };

    expect(res.status).toBe(200);
    expect(json.stopped).toBe(true);
    expect(stopImpersonation).toHaveBeenCalledWith({
      token: "tok-1",
      actorUserId: "actor-1",
    });
    expect(logOrgAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "org.impersonation.stopped",
      }),
    );
  });
});
