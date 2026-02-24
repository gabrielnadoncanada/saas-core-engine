import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const findFirst = vi.fn();
const deleteMany = vi.fn();

vi.mock("@/server/auth/require-user", () => ({
  requireUser,
}));

vi.mock("@db", () => ({
  prisma: {
    user: {
      findFirst,
    },
    oAuthAccount: {
      deleteMany,
    },
  },
}));

vi.mock("@/server/telemetry/otel", () => ({
  withApiTelemetry: async (_req: Request, _route: string, handler: () => Promise<Response>) =>
    handler(),
}));

describe("POST /api/auth/sign-in-methods/disconnect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks disconnect when it is the last sign-in method", async () => {
    requireUser.mockResolvedValueOnce({ userId: "u1" });
    findFirst.mockResolvedValueOnce({
      id: "u1",
      passwordHash: null,
      oauthAccounts: [{ provider: "google" }],
    });

    const { POST } = await import("@/app/api/auth/sign-in-methods/disconnect/route");
    const res = await POST(
      new Request("http://localhost/api/auth/sign-in-methods/disconnect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: "google" }),
      }),
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      ok: false,
      error: "must_add_another_method_first",
    });
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("disconnects provider when another method exists", async () => {
    requireUser.mockResolvedValueOnce({ userId: "u1" });
    findFirst.mockResolvedValueOnce({
      id: "u1",
      passwordHash: "hash",
      oauthAccounts: [{ provider: "google" }],
    });
    deleteMany.mockResolvedValueOnce({ count: 1 });

    const { POST } = await import("@/app/api/auth/sign-in-methods/disconnect/route");
    const res = await POST(
      new Request("http://localhost/api/auth/sign-in-methods/disconnect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: "google" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "u1",
        provider: "google",
      },
    });
  });
});
