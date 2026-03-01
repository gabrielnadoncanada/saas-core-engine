import { beforeEach, describe, expect, it, vi } from "vitest";

const requireOrgContext = vi.fn();
const getMembershipCustomPermissionKeys = vi.fn();
const requirePermission = vi.fn();

vi.mock("@/server/auth/require-org", () => ({
  requireOrgContext,
}));

vi.mock("@/server/services/org-rbac.service", () => ({
  getMembershipCustomPermissionKeys,
}));

vi.mock("@rbac-core", () => ({
  requirePermission,
}));

describe("withRequiredOrgScope", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireOrgContext.mockResolvedValue({
      userId: "u1",
      organizationId: "org1",
      role: "owner",
    });
    getMembershipCustomPermissionKeys.mockResolvedValue(["org:invite:create:invitation"]);
  });

  it("executes run with org context", async () => {
    const run = vi.fn(async () => "ok");
    const { withRequiredOrgScope } = await import("@/server/auth/with-org-scope");

    const result = await withRequiredOrgScope({
      action: "org:invite:create",
      run,
    });

    expect(result).toBe("ok");
    expect(run).toHaveBeenCalledWith({
      userId: "u1",
      organizationId: "org1",
      role: "owner",
    });
  });

  it("passes org-scoped permission context", async () => {
    const { withRequiredOrgScope } = await import("@/server/auth/with-org-scope");

    await withRequiredOrgScope({
      action: "org:invite:create",
      run: async () => null,
    });

    expect(requirePermission).toHaveBeenCalledWith(
      {
        userId: "u1",
        role: "owner",
        organizationId: "org1",
      },
      "org:invite:create",
      {
        organizationId: "org1",
        targetRole: undefined,
      },
      {
        customPermissions: ["org:invite:create:invitation"],
      },
    );
  });

  it("bubbles authorization failures", async () => {
    requirePermission.mockImplementationOnce(() => {
      throw new Error("FORBIDDEN");
    });
    const { withRequiredOrgScope } = await import("@/server/auth/with-org-scope");

    await expect(
      withRequiredOrgScope({
        action: "org:invite:create",
        run: async () => null,
      }),
    ).rejects.toThrow("FORBIDDEN");
  });
});

