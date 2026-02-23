import { beforeEach, describe, expect, it, vi } from "vitest";

const upsert = vi.fn();
const deleteMany = vi.fn();

vi.mock("@db", () => ({
  prisma: {
    authRateLimitBucket: {
      upsert,
      deleteMany,
    },
  },
}));

vi.mock("@/server/config/env", () => ({
  env: {
    RATE_LIMIT_ENABLED: true,
    RATE_LIMIT_WINDOW_SECONDS: 60,
    RATE_LIMIT_MAX_REQUESTS: 3,
    RATE_LIMIT_RETENTION_SECONDS: 86400,
    TRUST_PROXY_HEADERS: false,
  },
}));

describe("enforceAuthRateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    deleteMany.mockResolvedValue({ count: 0 });
  });

  it("increments bucket and allows request under limit", async () => {
    upsert.mockResolvedValueOnce({ count: 1 });
    const { enforceAuthRateLimit } = await import("@/server/auth/auth-rate-limit");

    await expect(
      enforceAuthRateLimit(new Request("http://localhost/api/auth/login"), "login"),
    ).resolves.toBeUndefined();

    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledTimes(1);
    const call = upsert.mock.calls[0]?.[0];
    expect(call.where.key_windowStart.key).toContain(":login");
  });

  it("throws rate_limited when count is above threshold", async () => {
    upsert.mockResolvedValueOnce({ count: 4 });
    const { enforceAuthRateLimit } = await import("@/server/auth/auth-rate-limit");

    await expect(
      enforceAuthRateLimit(new Request("http://localhost/api/auth/password/forgot"), "password_forgot"),
    ).rejects.toMatchObject({ code: "rate_limited" });
  });
});
