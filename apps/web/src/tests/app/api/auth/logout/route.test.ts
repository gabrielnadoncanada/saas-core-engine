import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionTokenFromCookie = vi.fn();
const clearSessionCookie = vi.fn();
const validateSession = vi.fn();
const revokeSession = vi.fn();

vi.mock("@/server/adapters/cookies/session-cookie.adapter", () => ({
  getSessionTokenFromCookie,
  clearSessionCookie,
}));

vi.mock("@/server/adapters/core/auth-core.adapter", () => ({
  createSessionService: () => ({
    validateSession,
    revokeSession,
  }),
}));

vi.mock("@/server/telemetry/otel", () => ({
  withApiTelemetry: async (_req: Request, _route: string, handler: () => Promise<Response>) =>
    handler(),
}));

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSessionCookie.mockResolvedValue(undefined);
  });

  it("clears cookie even when no session token is present", async () => {
    getSessionTokenFromCookie.mockResolvedValueOnce(null);

    const { POST } = await import("@/app/api/auth/logout/route");
    const res = await POST(new Request("http://localhost/api/auth/logout", { method: "POST" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(validateSession).not.toHaveBeenCalled();
    expect(revokeSession).not.toHaveBeenCalled();
    expect(clearSessionCookie).toHaveBeenCalledTimes(1);
  });

  it("revokes validated session before clearing cookie", async () => {
    getSessionTokenFromCookie.mockResolvedValueOnce("sess-token");
    validateSession.mockResolvedValueOnce({ sessionId: "s1" });

    const { POST } = await import("@/app/api/auth/logout/route");
    const res = await POST(new Request("http://localhost/api/auth/logout", { method: "POST" }));

    expect(res.status).toBe(200);
    expect(revokeSession).toHaveBeenCalledWith("s1");
    expect(clearSessionCookie).toHaveBeenCalledTimes(1);
  });
});
