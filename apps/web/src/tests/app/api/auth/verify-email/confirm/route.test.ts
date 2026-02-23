import { beforeEach, describe, expect, it, vi } from "vitest";

const confirm = vi.fn();
const getSessionUser = vi.fn();
const findUnique = vi.fn();
const logError = vi.fn();
const logInfo = vi.fn();
const logWarn = vi.fn();

vi.mock("@/server/adapters/core/auth-core.adapter", () => ({
  createVerifyEmailFlow: () => ({
    confirm,
  }),
}));

vi.mock("@/server/auth/require-user", () => ({
  getSessionUser,
}));

vi.mock("@db", () => ({
  prisma: {
    user: {
      findUnique,
    },
  },
}));

vi.mock("@/server/logging/logger", () => ({
  logError,
  logInfo,
  logWarn,
}));

vi.mock("@/server/services/url.service", () => ({
  absoluteUrl: vi.fn((path: string) => `http://localhost${path}`),
}));

describe("GET /api/auth/verify-email/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects with missing token error", async () => {
    const { GET } = await import("../../../../../../app/api/auth/verify-email/confirm/route");
    const res = await GET(new Request("http://localhost/api/auth/verify-email/confirm"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost/dashboard?error=missing_verification_token",
    );
    expect(confirm).not.toHaveBeenCalled();
  });

  it("redirects to verified=true when token confirmation succeeds", async () => {
    confirm.mockResolvedValueOnce({ ok: true, userId: "u1" });

    const { GET } = await import("../../../../../../app/api/auth/verify-email/confirm/route");
    const res = await GET(
      new Request("http://localhost/api/auth/verify-email/confirm?token=tok-123"),
    );

    expect(confirm).toHaveBeenCalledWith({ token: "tok-123" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/dashboard?verified=true");
  });

  it("falls back to verified=true when token is invalid but user is already verified", async () => {
    confirm.mockResolvedValueOnce({ ok: false });
    getSessionUser.mockResolvedValueOnce({ userId: "u1" });
    findUnique.mockResolvedValueOnce({ emailVerifiedAt: new Date("2025-01-01T00:00:00.000Z") });

    const { GET } = await import("../../../../../../app/api/auth/verify-email/confirm/route");
    const res = await GET(
      new Request("http://localhost/api/auth/verify-email/confirm?token=tok-123"),
    );

    expect(getSessionUser).toHaveBeenCalledTimes(1);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "u1" },
      select: { emailVerifiedAt: true },
    });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/dashboard?verified=true");
  });

  it("redirects to expired link when token is invalid and no verified session fallback", async () => {
    confirm.mockResolvedValueOnce({ ok: false });
    getSessionUser.mockResolvedValueOnce(null);

    const { GET } = await import("../../../../../../app/api/auth/verify-email/confirm/route");
    const res = await GET(
      new Request("http://localhost/api/auth/verify-email/confirm?token=tok-123"),
    );

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost/dashboard?error=expired_verification_link",
    );
  });
});
