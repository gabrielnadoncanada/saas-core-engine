import { beforeEach, describe, expect, it, vi } from "vitest";

const resetPassword = vi.fn();
const createSession = vi.fn();
const setSessionCookie = vi.fn();
const authErrorResponse = vi.fn();

vi.mock("@/server/adapters/core/auth-core.adapter", () => ({
  createPasswordResetFlow: () => ({
    reset: resetPassword,
  }),
  createSessionService: () => ({
    createSession,
  }),
}));

vi.mock("@/server/adapters/cookies/session-cookie.adapter", () => ({
  setSessionCookie,
}));

vi.mock("@/server/config/env", () => ({
  env: {
    SESSION_TTL_DAYS: 30,
  },
}));

vi.mock("@/server/auth/auth-error-response", () => ({
  authErrorResponse,
}));

vi.mock("@/server/telemetry/otel", () => ({
  withApiTelemetry: async (_req: Request, _route: string, handler: () => Promise<Response>) =>
    handler(),
}));

describe("POST /api/auth/password/reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid input", async () => {
    const { POST } = await import("@/app/api/auth/password/reset/route");
    const res = await POST(
      new Request("http://localhost/api/auth/password/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "" }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid_input" });
  });

  it("returns invalid_or_expired_token when flow reset fails", async () => {
    resetPassword.mockResolvedValueOnce({ ok: false });

    const { POST } = await import("@/app/api/auth/password/reset/route");
    const res = await POST(
      new Request("http://localhost/api/auth/password/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "tok-1", newPassword: "new-password" }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid_or_expired_token" });
  });

  it("creates session and sets cookie after successful reset", async () => {
    resetPassword.mockResolvedValueOnce({ ok: true, userId: "u1" });
    createSession.mockResolvedValueOnce({
      sessionToken: "sess",
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const { POST } = await import("@/app/api/auth/password/reset/route");
    const res = await POST(
      new Request("http://localhost/api/auth/password/reset", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "vitest",
        },
        body: JSON.stringify({ token: "tok-1", newPassword: "new-password" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(createSession).toHaveBeenCalledWith({
      userId: "u1",
      ttlDays: 30,
      userAgent: "vitest",
    });
    expect(setSessionCookie).toHaveBeenCalledTimes(1);
  });
});
