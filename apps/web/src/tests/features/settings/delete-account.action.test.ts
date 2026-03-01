import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const buildActionRequest = vi.fn();
const writeAuditLog = vi.fn();
const clearSessionCookie = vi.fn();
const withTx = vi.fn();

const tx = {
  session: { updateMany: vi.fn() },
  membership: { deleteMany: vi.fn() },
  oAuthAccount: { deleteMany: vi.fn() },
  emailToken: { deleteMany: vi.fn() },
  user: { update: vi.fn() },
};

const prisma = {
  membership: {
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  organization: {
    findMany: vi.fn(),
  },
};

vi.mock("@/server/auth/require-user", () => ({
  requireUser,
}));

vi.mock("@/server/http/build-server-action-request", () => ({
  buildActionRequest,
}));

vi.mock("@/server/audit/audit-log", () => ({
  writeAuditLog,
}));

vi.mock("@/server/adapters/cookies/session-cookie.adapter", () => ({
  clearSessionCookie,
}));

vi.mock("@db", () => ({
  prisma,
  withTx,
}));

describe("deleteAccountAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({
      userId: "u1",
      organizationId: "org1",
    });
    buildActionRequest.mockResolvedValue(new Request("http://localhost/settings/security"));
    prisma.membership.findMany.mockResolvedValue([]);
    prisma.membership.groupBy.mockResolvedValue([]);
    prisma.organization.findMany.mockResolvedValue([]);
    withTx.mockImplementation(async (cb: (innerTx: typeof tx) => Promise<void>) => cb(tx));
    tx.session.updateMany.mockResolvedValue({ count: 1 });
    tx.membership.deleteMany.mockResolvedValue({ count: 1 });
    tx.oAuthAccount.deleteMany.mockResolvedValue({ count: 0 });
    tx.emailToken.deleteMany.mockResolvedValue({ count: 0 });
    tx.user.update.mockResolvedValue({});
    clearSessionCookie.mockResolvedValue(undefined);
    writeAuditLog.mockResolvedValue(undefined);
  });

  it("blocks delete when user is last owner", async () => {
    prisma.membership.findMany.mockResolvedValue([{ organizationId: "org1" }]);
    prisma.membership.groupBy.mockResolvedValue([{ organizationId: "org1", _count: { _all: 1 } }]);
    prisma.organization.findMany.mockResolvedValue([{ name: "Core Org" }]);

    const { deleteAccountAction } = await import("@/features/settings/api/delete-account.action");
    const result = await deleteAccountAction();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("transfer ownership");
    }
    expect(withTx).not.toHaveBeenCalled();
  });

  it("soft deletes account and writes audit log", async () => {
    const { deleteAccountAction } = await import("@/features/settings/api/delete-account.action");
    const result = await deleteAccountAction();

    expect(result.ok).toBe(true);
    expect(withTx).toHaveBeenCalledTimes(1);
    expect(clearSessionCookie).toHaveBeenCalledTimes(1);
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "account.delete",
        result: "success",
      }),
    );
  });
});

