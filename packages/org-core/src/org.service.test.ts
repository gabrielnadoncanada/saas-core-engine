import { describe, expect, it, vi } from "vitest";
import { OrgService } from "./org.service";
import type {
  MembershipsRepo,
  OrgsRepo,
  SubscriptionsRepo,
  TxRunner,
  UsersRepo,
} from "./org.ports";

function passThroughTxRunner(): TxRunner {
  return {
    withTx: async <T>(fn: (tx: unknown) => Promise<T>) => fn({}),
  };
}

describe("OrgService", () => {
  it("creates org, owner membership, subscription and active org", async () => {
    const orgs: OrgsRepo = { create: vi.fn().mockResolvedValue({ id: "org1" }) };
    const memberships: MembershipsRepo = {
      create: vi.fn().mockResolvedValue({ id: "m1" }),
      findUserMembership: vi.fn(),
      ensureMembership: vi.fn(),
      findById: vi.fn(),
      countByRole: vi.fn(),
      updateRole: vi.fn(),
      remove: vi.fn(),
      listOrgMembers: vi.fn(),
      listUserOrganizations: vi.fn(),
    };
    const subs: SubscriptionsRepo = {
      upsertOrgSubscription: vi.fn().mockResolvedValue({ id: "s1" }),
    };
    const users: UsersRepo = {
      findById: vi.fn(),
      setActiveOrganization: vi.fn().mockResolvedValue(undefined),
    };

    const svc = new OrgService(orgs, memberships, subs, users, passThroughTxRunner());
    const result = await svc.createOrg({ ownerUserId: "u1", name: "Acme" });

    expect(result.organizationId).toBe("org1");
    expect(users.setActiveOrganization).toHaveBeenCalledWith(
      "u1",
      "org1",
      expect.anything(),
    );
  });

  it("switches active organization for existing members", async () => {
    const orgs: OrgsRepo = { create: vi.fn() };
    const memberships: MembershipsRepo = {
      create: vi.fn(),
      findUserMembership: vi.fn().mockResolvedValue({
        id: "m1",
        userId: "u1",
        organizationId: "org1",
        role: "member",
        createdAt: new Date(),
      }),
      ensureMembership: vi.fn(),
      findById: vi.fn(),
      countByRole: vi.fn(),
      updateRole: vi.fn(),
      remove: vi.fn(),
      listOrgMembers: vi.fn(),
      listUserOrganizations: vi.fn(),
    };
    const subs: SubscriptionsRepo = {
      upsertOrgSubscription: vi.fn(),
    };
    const users: UsersRepo = {
      findById: vi.fn(),
      setActiveOrganization: vi.fn().mockResolvedValue(undefined),
    };

    const svc = new OrgService(orgs, memberships, subs, users, passThroughTxRunner());
    const result = await svc.switchActiveOrganization({
      userId: "u1",
      organizationId: "org1",
    });

    expect(result.organizationId).toBe("org1");
    expect(users.setActiveOrganization).toHaveBeenCalledWith(
      "u1",
      "org1",
      expect.anything(),
    );
  });
});
