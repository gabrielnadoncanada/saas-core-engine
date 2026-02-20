import { describe, expect, it, vi } from "vitest";
import { OrgCoreError } from "./errors";
import { MembershipService } from "./membership.service";
import type { MembershipsRepo, TxRunner } from "./org.ports";

function passThroughTxRunner(): TxRunner {
  return {
    withTx: async <T>(fn: (tx: unknown) => Promise<T>) => fn({}),
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
    listUserOrganizations: vi.fn(),
  };
}

describe("MembershipService", () => {
  it("throws forbidden when user is not a member", async () => {
    const memberships = mockMembershipsRepo();
    vi.mocked(memberships.findUserMembership).mockResolvedValue(null);
    const svc = new MembershipService(memberships, passThroughTxRunner());

    await expect(
      svc.requireOrgRole({
        userId: "u1",
        organizationId: "org1",
        roles: ["owner"],
      }),
    ).rejects.toMatchObject({ code: "forbidden" } as Partial<OrgCoreError>);
  });

  it("throws forbidden when role is insufficient", async () => {
    const memberships = mockMembershipsRepo();
    vi.mocked(memberships.findUserMembership).mockResolvedValue({
      id: "m1",
      userId: "u1",
      organizationId: "org1",
      role: "member",
      createdAt: new Date(),
    });
    const svc = new MembershipService(memberships, passThroughTxRunner());

    await expect(
      svc.requireOrgRole({
        userId: "u1",
        organizationId: "org1",
        roles: ["owner", "admin"],
      }),
    ).rejects.toMatchObject({ code: "forbidden" } as Partial<OrgCoreError>);
  });

  it("blocks demoting the last owner", async () => {
    const memberships = mockMembershipsRepo();
    vi.mocked(memberships.findUserMembership).mockResolvedValue({
      id: "m-owner",
      userId: "u-owner",
      organizationId: "org1",
      role: "owner",
      createdAt: new Date(),
    });
    vi.mocked(memberships.findById).mockResolvedValue({
      id: "m-owner",
      userId: "u-owner",
      organizationId: "org1",
      role: "owner",
      createdAt: new Date(),
    });
    vi.mocked(memberships.countByRole).mockResolvedValue(1);

    const svc = new MembershipService(memberships, passThroughTxRunner());

    await expect(
      svc.changeMemberRole({
        actorUserId: "u-owner",
        organizationId: "org1",
        membershipId: "m-owner",
        role: "admin",
      }),
    ).rejects.toMatchObject({ code: "forbidden" } as Partial<OrgCoreError>);
  });

  it("prevents admin from removing owner", async () => {
    const memberships = mockMembershipsRepo();
    vi.mocked(memberships.findUserMembership).mockResolvedValue({
      id: "m-admin",
      userId: "u-admin",
      organizationId: "org1",
      role: "admin",
      createdAt: new Date(),
    });
    vi.mocked(memberships.findById).mockResolvedValue({
      id: "m-owner",
      userId: "u-owner",
      organizationId: "org1",
      role: "owner",
      createdAt: new Date(),
    });

    const svc = new MembershipService(memberships, passThroughTxRunner());

    await expect(
      svc.removeMember({
        actorUserId: "u-admin",
        organizationId: "org1",
        membershipId: "m-owner",
      }),
    ).rejects.toMatchObject({ code: "forbidden" } as Partial<OrgCoreError>);
  });

  it("prevents admin from assigning super_admin", async () => {
    const memberships = mockMembershipsRepo();
    vi.mocked(memberships.findUserMembership).mockResolvedValue({
      id: "m-admin",
      userId: "u-admin",
      organizationId: "org1",
      role: "admin",
      createdAt: new Date(),
    });
    vi.mocked(memberships.findById).mockResolvedValue({
      id: "m-member",
      userId: "u-member",
      organizationId: "org1",
      role: "member",
      createdAt: new Date(),
    });

    const svc = new MembershipService(memberships, passThroughTxRunner());

    await expect(
      svc.changeMemberRole({
        actorUserId: "u-admin",
        organizationId: "org1",
        membershipId: "m-member",
        role: "super_admin",
      }),
    ).rejects.toMatchObject({ code: "forbidden" } as Partial<OrgCoreError>);
  });

  it("transfers ownership and demotes previous owner to admin", async () => {
    const memberships = mockMembershipsRepo();
    vi.mocked(memberships.findUserMembership).mockResolvedValue({
      id: "m-owner",
      userId: "u-owner",
      organizationId: "org1",
      role: "owner",
      createdAt: new Date(),
    });
    vi.mocked(memberships.findById).mockResolvedValue({
      id: "m-admin",
      userId: "u-admin",
      organizationId: "org1",
      role: "admin",
      createdAt: new Date(),
    });
    vi.mocked(memberships.updateRole).mockResolvedValue(undefined);

    const svc = new MembershipService(memberships, passThroughTxRunner());

    await svc.transferOwnership({
      currentOwnerUserId: "u-owner",
      organizationId: "org1",
      nextOwnerMembershipId: "m-admin",
    });

    expect(memberships.updateRole).toHaveBeenCalledWith("m-admin", "owner", expect.anything());
    expect(memberships.updateRole).toHaveBeenCalledWith("m-owner", "admin", expect.anything());
  });
});
