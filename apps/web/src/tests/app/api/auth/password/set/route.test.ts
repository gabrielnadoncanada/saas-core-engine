import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const hashPassword = vi.fn();
const findFirst = vi.fn();
const update = vi.fn();

vi.mock("@/server/auth/require-user", () => ({
  requireUser,
}));

vi.mock("@auth-core", () => ({
  hashPassword,
}));

vi.mock("@db", () => ({
  prisma: {
    user: {
      findFirst,
      update,
    },
  },
}));

vi.mock("@/server/telemetry/otel", () => ({
  withApiTelemetry: async (_req: Request, _route: string, handler: () => Promise<Response>) =>
    handler(),
}));

describe("POST /api/auth/password/set", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 on invalid input", async () => {
    requireUser.mockResolvedValueOnce({ userId: "u1" });

    const { POST } = await import("@/app/api/auth/password/set/route");
    const res = await POST(
      new Request("http://localhost/api/auth/password/set", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "short", confirmPassword: "short" }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid_input" });
  });

  it("sets password for oauth-only account", async () => {
    requireUser.mockResolvedValueOnce({ userId: "u1" });
    findFirst.mockResolvedValueOnce({ id: "u1", passwordHash: null });
    hashPassword.mockResolvedValueOnce("hash-1");

    const { POST } = await import("@/app/api/auth/password/set/route");
    const res = await POST(
      new Request("http://localhost/api/auth/password/set", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          password: "StrongPass123!",
          confirmPassword: "StrongPass123!",
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { passwordHash: "hash-1" },
    });
  });
});
