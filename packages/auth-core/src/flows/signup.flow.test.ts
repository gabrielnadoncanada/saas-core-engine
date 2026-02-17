import { describe, it, expect, vi } from "vitest";
import { SignupFlow } from "./signup.flow";
import type {
  MembershipsRepo,
  OrgsRepo,
  SubscriptionsRepo,
  TxRunner,
  UsersRepo,
} from "../auth.ports";

function mockUsersRepo(overrides: Partial<UsersRepo> = {}): UsersRepo {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByEmail: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: "u1", email: "a@b.com", passwordHash: "hash" }),
    markEmailVerified: vi.fn(),
    setPasswordHash: vi.fn(),
    touchLastLogin: vi.fn(),
    ...overrides,
  };
}

function mockOrgsRepo(): OrgsRepo {
  return { create: vi.fn().mockResolvedValue({ id: "org-1" }) };
}

function mockMembershipsRepo(): MembershipsRepo {
  return { create: vi.fn().mockResolvedValue({ id: "m-1" }) };
}

function mockSubsRepo(): SubscriptionsRepo {
  return { upsertOrgSubscription: vi.fn().mockResolvedValue({ id: "sub-1" }) };
}

const passThroughTx: TxRunner = {
  withTx: (fn) => fn(undefined),
};

describe("SignupFlow", () => {
  it("creates user, org, membership, and subscription", async () => {
    const users = mockUsersRepo();
    const orgs = mockOrgsRepo();
    const memberships = mockMembershipsRepo();
    const subs = mockSubsRepo();

    const flow = new SignupFlow(users, orgs, memberships, subs, passThroughTx);
    const res = await flow.execute({
      email: "new@example.com",
      password: "secure-password-123",
      orgName: "My Org",
    });

    expect(res).toEqual({ userId: "u1", organizationId: "org-1" });
    expect(users.create).toHaveBeenCalledOnce();
    expect(orgs.create).toHaveBeenCalledWith("My Org", undefined);
    expect(memberships.create).toHaveBeenCalledWith(
      { userId: "u1", organizationId: "org-1", role: "owner" },
      undefined,
    );
    expect(subs.upsertOrgSubscription).toHaveBeenCalledWith(
      { organizationId: "org-1", plan: "free", status: "inactive" },
      undefined,
    );
  });

  it("throws if email already exists", async () => {
    const users = mockUsersRepo({
      findByEmail: vi.fn().mockResolvedValue({ id: "existing", email: "a@b.com", passwordHash: "h" }),
    });

    const flow = new SignupFlow(users, mockOrgsRepo(), mockMembershipsRepo(), mockSubsRepo(), passThroughTx);

    await expect(
      flow.execute({ email: "a@b.com", password: "secure-password-123", orgName: "Org" }),
    ).rejects.toThrow("Email already in use");
  });

  it("lowercases email", async () => {
    const users = mockUsersRepo();
    const flow = new SignupFlow(users, mockOrgsRepo(), mockMembershipsRepo(), mockSubsRepo(), passThroughTx);

    await flow.execute({ email: "User@EXAMPLE.com", password: "secure-password-123", orgName: "Org" });

    expect(users.findByEmail).toHaveBeenCalledWith("user@example.com", undefined);
  });

  it("maps unique constraint errors to email_in_use", async () => {
    const users = mockUsersRepo({
      create: vi.fn().mockRejectedValue({ code: "P2002" }),
    });
    const flow = new SignupFlow(users, mockOrgsRepo(), mockMembershipsRepo(), mockSubsRepo(), passThroughTx);

    await expect(
      flow.execute({ email: "test@example.com", password: "secure-password-123", orgName: "Org" }),
    ).rejects.toThrow("Email already in use");
  });
});
