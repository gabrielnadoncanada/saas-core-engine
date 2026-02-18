import { describe, expect, it, vi } from "vitest";
import { OrgCoreError } from "./errors";
import { InviteService } from "./invite.service";
import type {
  InviteToken,
  InvitationsRepo,
  MembershipsRepo,
  TxRunner,
  UsersRepo,
} from "./org.ports";

function passThroughTxRunner(): TxRunner {
  return {
    withTx: async <T>(fn: (tx: unknown) => Promise<T>) => fn({}),
  };
}

function mockInvitesRepo(): InvitationsRepo {
  return {
    create: vi.fn(),
    findValidByTokenHash: vi.fn(),
    markAcceptedIfPending: vi.fn(),
    listPending: vi.fn(),
  };
}

function mockUsersRepo(): UsersRepo {
  return {
    findById: vi.fn(),
    setActiveOrganization: vi.fn(),
  };
}

function mockMembershipsRepo(): MembershipsRepo {
  return {
    create: vi.fn(),
    findUserMembership: vi.fn(),
    ensureMembership: vi.fn(),
    findById: vi.fn(),
    countByRole: vi.fn(),
    updateRole: vi.fn(),
    remove: vi.fn(),
    listOrgMembers: vi.fn(),
  };
}

function fixedInviteToken(): InviteToken {
  return {
    randomToken: vi.fn(() => "raw-token"),
    hashToken: vi.fn((raw: string) => `hash:${raw}`),
  };
}

describe("InviteService", () => {
  it("rejects createInvite for non owner/admin inviter", async () => {
    const invites = mockInvitesRepo();
    const users = mockUsersRepo();
    const memberships = mockMembershipsRepo();
    vi.mocked(memberships.findUserMembership).mockResolvedValue({
      id: "m1",
      userId: "u1",
      organizationId: "org1",
      role: "member",
      createdAt: new Date(),
    });

    const svc = new InviteService(
      invites,
      users,
      memberships,
      passThroughTxRunner(),
      fixedInviteToken(),
    );

    await expect(
      svc.createInvite({
        organizationId: "org1",
        inviterUserId: "u1",
        email: "test@example.com",
        role: "member",
        ttlMinutes: 10,
      }),
    ).rejects.toMatchObject({ code: "forbidden" } as Partial<OrgCoreError>);
  });

  it("clamps invite ttl to at least 60 minutes", async () => {
    const invites = mockInvitesRepo();
    const users = mockUsersRepo();
    const memberships = mockMembershipsRepo();
    vi.mocked(memberships.findUserMembership).mockResolvedValue({
      id: "m1",
      userId: "u1",
      organizationId: "org1",
      role: "owner",
      createdAt: new Date(),
    });
    vi.mocked(invites.create).mockImplementation(async (params: {
      organizationId: string;
      email: string;
      role: "owner" | "admin" | "member";
      tokenHash: string;
      expiresAt: Date;
    }) => ({
      id: "i1",
      organizationId: params.organizationId,
      email: params.email,
      role: params.role,
      createdAt: new Date(),
      expiresAt: params.expiresAt,
      acceptedAt: null,
    }));

    const svc = new InviteService(
      invites,
      users,
      memberships,
      passThroughTxRunner(),
      fixedInviteToken(),
    );

    const before = Date.now();
    await svc.createInvite({
      organizationId: "org1",
      inviterUserId: "u1",
      email: "test@example.com",
      role: "member",
      ttlMinutes: 1,
    });

    const call = vi.mocked(invites.create).mock.calls[0]?.[0];
    expect(call).toBeTruthy();
    const deltaMs = call!.expiresAt.getTime() - before;
    expect(deltaMs).toBeGreaterThanOrEqual(59 * 60 * 1000);
  });

  it("accepts invite, ensures membership and activates organization", async () => {
    const invites = mockInvitesRepo();
    const users = mockUsersRepo();
    const memberships = mockMembershipsRepo();

    vi.mocked(invites.findValidByTokenHash).mockResolvedValue({
      id: "i1",
      organizationId: "org1",
      email: "test@example.com",
      role: "member",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 1000),
      acceptedAt: null,
    });
    vi.mocked(users.findById).mockResolvedValue({ id: "u1", email: "test@example.com" });
    vi.mocked(memberships.ensureMembership).mockResolvedValue({ id: "m1" });
    vi.mocked(invites.markAcceptedIfPending).mockResolvedValue(true);
    vi.mocked(users.setActiveOrganization).mockResolvedValue(undefined);

    const svc = new InviteService(
      invites,
      users,
      memberships,
      passThroughTxRunner(),
      fixedInviteToken(),
    );

    const result = await svc.acceptInvite({ token: "raw-token", acceptUserId: "u1" });

    expect(result.organizationId).toBe("org1");
    expect(memberships.ensureMembership).toHaveBeenCalledWith(
      { userId: "u1", organizationId: "org1", role: "member" },
      expect.anything(),
    );
    expect(users.setActiveOrganization).toHaveBeenCalledWith(
      "u1",
      "org1",
      expect.anything(),
    );
  });
});
