import { beforeEach, describe, expect, it, vi } from "vitest";

const requireOrgContext = vi.fn();
const buildActionRequest = vi.fn();
const writeAuditLog = vi.fn();
const cancelSubscription = vi.fn();
const withTx = vi.fn();

const tx = {
  organization: {
    delete: vi.fn(),
  },
  membership: {
    findFirst: vi.fn(),
  },
  user: {
    updateMany: vi.fn(),
  },
};

const prisma = {
  subscription: {
    findUnique: vi.fn(),
  },
};

vi.mock("@/server/auth/require-org", () => ({
  requireOrgContext,
}));

vi.mock("@/server/http/build-server-action-request", () => ({
  buildActionRequest,
}));

vi.mock("@/server/audit/audit-log", () => ({
  writeAuditLog,
}));

vi.mock("@/server/services/stripe.service", () => ({
  stripe: () => ({
    subscriptions: {
      cancel: cancelSubscription,
    },
  }),
}));

vi.mock("@db", () => ({
  prisma,
  withTx,
}));

vi.mock("@/server/config/env", () => ({
  env: {
    BILLING_ENABLED: false,
  },
}));

describe("deleteCurrentOrganizationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildActionRequest.mockResolvedValue(new Request("http://localhost/settings/security"));
    withTx.mockImplementation(async (cb: (innerTx: typeof tx) => Promise<void>) => cb(tx));
    prisma.subscription.findUnique.mockResolvedValue(null);
    tx.membership.findFirst.mockResolvedValue(null);
    tx.organization.delete.mockResolvedValue(undefined);
    tx.user.updateMany.mockResolvedValue({ count: 1 });
    writeAuditLog.mockResolvedValue(undefined);
  });

  it("returns forbidden for non-owner", async () => {
    requireOrgContext.mockResolvedValue({
      userId: "u1",
      organizationId: "org1",
      role: "member",
    });

    const { deleteCurrentOrganizationAction } = await import(
      "@/features/settings/api/delete-current-organization.action"
    );
    const result = await deleteCurrentOrganizationAction();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Only organization owners");
    }
    expect(tx.organization.delete).not.toHaveBeenCalled();
  });

  it("deletes organization for owner", async () => {
    requireOrgContext.mockResolvedValue({
      userId: "u1",
      organizationId: "org1",
      role: "owner",
    });

    const { deleteCurrentOrganizationAction } = await import(
      "@/features/settings/api/delete-current-organization.action"
    );
    const result = await deleteCurrentOrganizationAction();

    expect(result.ok).toBe(true);
    expect(tx.organization.delete).toHaveBeenCalledWith({ where: { id: "org1" } });
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "organization.delete",
        result: "success",
      }),
    );
  });
});

