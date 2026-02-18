import { describe, it, expect, vi } from "vitest";
import { OAuthLoginFlow } from "./oauth-login.flow";
import type { OAuthAccountsRepo, UsersRepo } from "../auth.ports";

function mockUsers(overrides: Partial<UsersRepo> = {}): UsersRepo {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByEmail: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: "u-new", email: "a@b.com", passwordHash: null }),
    markEmailVerified: vi.fn(),
    setPasswordHash: vi.fn(),
    touchLastLogin: vi.fn(),
    ...overrides,
  };
}

function mockOAuthAccounts(overrides: Partial<OAuthAccountsRepo> = {}): OAuthAccountsRepo {
  return {
    findByProviderAccount: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: "oa-1" }),
    ...overrides,
  };
}

describe("OAuthLoginFlow", () => {
  it("returns existing userId if account already linked", async () => {
    const accounts = mockOAuthAccounts({
      findByProviderAccount: vi.fn().mockResolvedValue({ userId: "u1" }),
    });

    const flow = new OAuthLoginFlow(mockUsers(), accounts);
    const res = await flow.linkOrCreate({
      provider: "google",
      providerAccountId: "goog-123",
      email: "a@b.com",
    });

    expect(res).toEqual({ userId: "u1" });
    expect(accounts.create).not.toHaveBeenCalled();
  });

  it("creates user and links account for new user", async () => {
    const users = mockUsers();
    const accounts = mockOAuthAccounts();

    const flow = new OAuthLoginFlow(users, accounts);
    const res = await flow.linkOrCreate({
      provider: "google",
      providerAccountId: "goog-456",
      email: "new@example.com",
      emailVerified: true,
    });

    expect(res).toEqual({ userId: "u-new" });
    expect(users.create).toHaveBeenCalledWith(
      { email: "new@example.com", passwordHash: null },
      undefined,
    );
    expect(accounts.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u-new",
        provider: "google",
        providerAccountId: "goog-456",
      }),
    );
    expect(users.markEmailVerified).toHaveBeenCalledWith("u-new");
  });

  it("links to existing user if email matches", async () => {
    const users = mockUsers({
      findByEmail: vi.fn().mockResolvedValue({ id: "u-existing", email: "a@b.com", passwordHash: "h" }),
    });
    const accounts = mockOAuthAccounts();

    const flow = new OAuthLoginFlow(users, accounts);
    const res = await flow.linkOrCreate({
      provider: "google",
      providerAccountId: "goog-789",
      email: "A@B.com",
      emailVerified: true,
    });

    expect(res).toEqual({ userId: "u-existing" });
    expect(users.create).not.toHaveBeenCalled();
    expect(accounts.create).toHaveBeenCalled();
  });

  it("throws if no email provided and no existing account", async () => {
    const flow = new OAuthLoginFlow(mockUsers(), mockOAuthAccounts());

    await expect(
      flow.linkOrCreate({
        provider: "google",
        providerAccountId: "goog-000",
      }),
    ).rejects.toThrow("OAuth email is missing or unverified");
  });

  it("throws if email is not verified", async () => {
    const flow = new OAuthLoginFlow(mockUsers(), mockOAuthAccounts());

    await expect(
      flow.linkOrCreate({
        provider: "google",
        providerAccountId: "goog-111",
        email: "user@example.com",
        emailVerified: false,
      }),
    ).rejects.toThrow("OAuth email is missing or unverified");
  });

  it("recovers from concurrent user creation with same email", async () => {
    const users = mockUsers({
      create: vi.fn().mockRejectedValue({ code: "P2002" }),
      findByEmail: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "u-race", email: "race@example.com", passwordHash: null }),
    });
    const accounts = mockOAuthAccounts();

    const flow = new OAuthLoginFlow(users, accounts);
    const res = await flow.linkOrCreate({
      provider: "google",
      providerAccountId: "goog-race",
      email: "race@example.com",
      emailVerified: true,
    });

    expect(res).toEqual({ userId: "u-race" });
    expect(accounts.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u-race",
        providerAccountId: "goog-race",
      }),
    );
  });
});
