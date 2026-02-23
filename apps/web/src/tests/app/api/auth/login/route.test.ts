import { beforeEach, describe, expect, it, vi } from "vitest";

const executeLogin = vi.fn();
const createSession = vi.fn();
const setSessionCookie = vi.fn();
const enforceAuthRateLimit = vi.fn();
const authErrorResponse = vi.fn();

vi.mock("@/server/adapters/core/auth-core.adapter", () => ({
  createLoginFlow: () => ({
    execute: executeLogin,
  }),
  createSessionService: () => ({
    createSession,
  }),
}));

vi.mock("@/server/adapters/cookies/session-cookie.adapter", () => ({
  setSessionCookie,
}));

vi.mock("@/server/auth/auth-rate-limit", () => ({
  enforceAuthRateLimit,
}));

vi.mock("@/server/auth/auth-error-response", () => ({
  authErrorResponse,
}));

vi.mock("@/server/config/env", () => ({
  env: {
    SESSION_TTL_DAYS: 30,
  },
}));

vi.mock("@/server/telemetry/otel", () => ({
  withApiTelemetry: async (_req: Request, _route: string, handler: () => Promise<Response>) =>
    handler(),
}));

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceAuthRateLimit.mockResolvedValue(undefined);
  });

  it("returns 400 for invalid input", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "" }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid_input" });
  });

  it("returns generic unauthorized for invalid credentials", async () => {
    executeLogin.mockResolvedValueOnce({ ok: false });

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", password: "bad" }),
      }),
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: "unauthorized" });
  });

  it("creates a session and cookie for valid credentials", async () => {
    executeLogin.mockResolvedValueOnce({ ok: true, userId: "u1" });
    createSession.mockResolvedValueOnce({
      sessionToken: "sess-token",
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": "vitest" },
        body: JSON.stringify({ email: "user@example.com", password: "good" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(createSession).toHaveBeenCalledWith({
      userId: "u1",
      ttlDays: 30,
      ip: null,
      userAgent: "vitest",
    });
    expect(setSessionCookie).toHaveBeenCalledTimes(1);
  });

  it("returns mapped error response when rate limit is exceeded", async () => {
    authErrorResponse.mockReturnValueOnce(
      Response.json({ ok: false, error: "rate_limited" }, { status: 429 }),
    );
    enforceAuthRateLimit.mockRejectedValueOnce(new Error("limit"));

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", password: "good" }),
      }),
    );

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ ok: false, error: "rate_limited" });
    expect(authErrorResponse).toHaveBeenCalledTimes(1);
  });
});
