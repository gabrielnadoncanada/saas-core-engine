import { beforeEach, describe, expect, it, vi } from "vitest";

const set = vi.fn();
const get = vi.fn();
const cookiesMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/server/config/env", () => ({
  env: {
    SESSION_COOKIE_NAME: "session",
    SESSION_COOKIE_SECURE: true,
    SESSION_COOKIE_SAME_SITE: "lax",
  },
}));

describe("session-cookie.adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookiesMock.mockResolvedValue({ set, get });
  });

  it("sets cookie with secure/httpOnly flags", async () => {
    const { setSessionCookie } = await import("@/server/adapters/cookies/session-cookie.adapter");
    const expiresAt = new Date("2026-01-01T00:00:00.000Z");

    await setSessionCookie({
      sessionToken: "token-1",
      expiresAt,
    });

    expect(set).toHaveBeenCalledWith("session", "token-1", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
  });

  it("clears cookie with epoch expiration", async () => {
    const { clearSessionCookie } = await import(
      "@/server/adapters/cookies/session-cookie.adapter"
    );

    await clearSessionCookie();

    expect(set).toHaveBeenCalledWith(
      "session",
      "",
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
      }),
    );
    const options = set.mock.calls[0]?.[2];
    expect(options.expires.getTime()).toBe(new Date(0).getTime());
  });

  it("reads session token from cookie store", async () => {
    get.mockReturnValueOnce({ value: "token-2" });
    const { getSessionTokenFromCookie } = await import(
      "@/server/adapters/cookies/session-cookie.adapter"
    );

    await expect(getSessionTokenFromCookie()).resolves.toBe("token-2");
  });
});
