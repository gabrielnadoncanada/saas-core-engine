import { beforeEach, describe, expect, it, vi } from "vitest";

const requestReset = vi.fn();
const sendResetPassword = vi.fn();
const enforceAuthRateLimit = vi.fn();
const authErrorResponse = vi.fn();

vi.mock("@/server/adapters/core/auth-core.adapter", () => ({
  createPasswordResetFlow: () => ({
    request: requestReset,
  }),
}));

vi.mock("@/server/services/email.service", () => ({
  getEmailService: () => ({
    sendResetPassword,
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

describe("POST /api/auth/password/forgot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceAuthRateLimit.mockResolvedValue(undefined);
  });

  it("returns ok=true for missing email (anti-enumeration)", async () => {
    const { POST } = await import("@/app/api/auth/password/forgot/route");
    const res = await POST(
      new Request("http://localhost/api/auth/password/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(requestReset).not.toHaveBeenCalled();
    expect(sendResetPassword).not.toHaveBeenCalled();
  });

  it("returns ok=true without sending email when no token is issued", async () => {
    requestReset.mockResolvedValueOnce({ ok: true });

    const { POST } = await import("@/app/api/auth/password/forgot/route");
    const res = await POST(
      new Request("http://localhost/api/auth/password/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "unknown@example.com" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(sendResetPassword).not.toHaveBeenCalled();
  });

  it("sends reset email when token is returned", async () => {
    requestReset.mockResolvedValueOnce({ ok: true, token: "tok-123" });

    const { POST } = await import("@/app/api/auth/password/forgot/route");
    const res = await POST(
      new Request("http://localhost/api/auth/password/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "known@example.com" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(sendResetPassword).toHaveBeenCalledWith(
      "known@example.com",
      "http://localhost/reset-password?token=tok-123",
    );
  });
});
