import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthCoreError } from "@auth-core";

const executeSignup = vi.fn();
const requestVerifyEmail = vi.fn();
const sendVerifyEmail = vi.fn();
const enforceAuthRateLimit = vi.fn();
const authErrorResponse = vi.fn();

vi.mock("@/server/adapters/core/auth-core.adapter", () => ({
  createSignupFlow: () => ({
    execute: executeSignup,
  }),
  createVerifyEmailFlow: () => ({
    request: requestVerifyEmail,
  }),
}));

vi.mock("@/server/services/email.service", () => ({
  getEmailService: () => ({
    sendVerifyEmail,
  }),
}));

vi.mock("@/server/services/url.service", () => ({
  absoluteUrl: vi.fn((path: string) => `http://localhost${path}`),
}));

vi.mock("@/server/auth/auth-rate-limit", () => ({
  enforceAuthRateLimit,
}));

vi.mock("@/server/auth/auth-error-response", () => ({
  authErrorResponse,
}));

vi.mock("@/server/telemetry/otel", () => ({
  withApiTelemetry: async (_req: Request, _route: string, handler: () => Promise<Response>) =>
    handler(),
}));

vi.mock("@/server/adapters/cookies/session-cookie.adapter", () => ({
  setSessionCookie: vi.fn(),
}));

vi.mock("@/server/config/env", () => ({
  env: {
    SESSION_TTL_DAYS: 30,
  },
}));

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceAuthRateLimit.mockResolvedValue(undefined);
  });

  it("returns 400 for invalid input", async () => {
    const { POST } = await import("@/app/api/auth/signup/route");
    const res = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "", password: "123", orgName: "" }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid_input" });
  });

  it("returns generic ok=true when email already exists", async () => {
    const duplicate = new AuthCoreError("email_in_use", "Email already in use");
    executeSignup.mockRejectedValueOnce(duplicate);

    const { POST } = await import("@/app/api/auth/signup/route");
    const res = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "existing@example.com",
          password: "Password123!",
          orgName: "Acme",
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(requestVerifyEmail).not.toHaveBeenCalled();
    expect(sendVerifyEmail).not.toHaveBeenCalled();
  });

  it("creates signup and sends verify email when account is new", async () => {
    executeSignup.mockResolvedValueOnce({ userId: "u1", organizationId: "org1" });
    requestVerifyEmail.mockResolvedValueOnce({ token: "verify-token" });

    const { POST } = await import("@/app/api/auth/signup/route");
    const res = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "new@example.com",
          password: "Password123!",
          orgName: "Acme",
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(requestVerifyEmail).toHaveBeenCalledWith({
      userId: "u1",
      email: "new@example.com",
      ttlMinutes: 60,
    });
    expect(sendVerifyEmail).toHaveBeenCalledWith(
      "new@example.com",
      "http://localhost/api/auth/verify-email/confirm?token=verify-token",
    );
  });

  it("returns mapped error response when rate limit check fails", async () => {
    authErrorResponse.mockReturnValueOnce(
      Response.json({ ok: false, error: "rate_limited" }, { status: 429 }),
    );
    enforceAuthRateLimit.mockRejectedValueOnce(new Error("limit"));

    const { POST } = await import("@/app/api/auth/signup/route");
    const res = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "new@example.com",
          password: "Password123!",
          orgName: "Acme",
        }),
      }),
    );

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ ok: false, error: "rate_limited" });
  });
});
