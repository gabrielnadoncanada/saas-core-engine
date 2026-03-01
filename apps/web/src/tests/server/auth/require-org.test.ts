import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const findUnique = vi.fn();

vi.mock("@/server/auth/require-user", () => ({
  requireUser,
}));

vi.mock("@db", () => ({
  prisma: {
    membership: {
      findUnique,
    },
  },
}));

describe("require-org", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns null active org when membership for active org is missing", async () => {
    requireUser.mockResolvedValue({ userId: "u1", organizationId: "org1" });
    findUnique.mockResolvedValue(null);

    const { getActiveOrgIdForUser } = await import("@/server/auth/require-org");
    await expect(getActiveOrgIdForUser()).resolves.toBeNull();
  });

  it("throws FORBIDDEN when explicit org is outside membership", async () => {
    requireUser.mockResolvedValue({ userId: "u1", organizationId: "org1" });
    findUnique.mockResolvedValue(null);

    const { requireOrgContext } = await import("@/server/auth/require-org");
    await expect(requireOrgContext({ organizationId: "org2" })).rejects.toThrow("FORBIDDEN");
  });

  it("returns org context for valid membership", async () => {
    requireUser.mockResolvedValue({ userId: "u1", organizationId: "org1" });
    findUnique.mockResolvedValue({
      organizationId: "org1",
      role: "admin",
    });

    const { requireOrgContext } = await import("@/server/auth/require-org");
    await expect(requireOrgContext()).resolves.toEqual({
      organizationId: "org1",
      userId: "u1",
      role: "admin",
    });
  });
});

