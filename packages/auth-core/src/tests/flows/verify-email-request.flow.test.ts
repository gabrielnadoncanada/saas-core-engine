import { describe, expect, it, vi } from "vitest";
import { VerifyEmailRequestFlow } from "../../flows/verify-email-request.flow";
import type { UsersRepo } from "../../auth.ports";
import type { VerifyEmailFlow } from "../../flows/verify-email.flow";

function mockUsers(overrides: Partial<UsersRepo> = {}): UsersRepo {
  return {
    findById: vi.fn().mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      passwordHash: null,
      emailVerifiedAt: null,
    }),
    findByEmail: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    markEmailVerified: vi.fn(),
    setPasswordHash: vi.fn(),
    touchLastLogin: vi.fn(),
    setActiveOrganization: vi.fn(),
    ...overrides,
  };
}

function mockVerifyEmailFlow(): VerifyEmailFlow {
  return {
    request: vi.fn().mockResolvedValue({
      token: "token_1",
      expiresAt: new Date(Date.now() + 60_000),
    }),
  } as unknown as VerifyEmailFlow;
}

describe("VerifyEmailRequestFlow", () => {
  it("returns alreadyVerified when user is already verified", async () => {
    const users = mockUsers({
      findById: vi.fn().mockResolvedValue({
        id: "u1",
        email: "user@example.com",
        passwordHash: null,
        emailVerifiedAt: new Date(),
      }),
    });
    const flow = new VerifyEmailRequestFlow(users, mockVerifyEmailFlow());

    const result = await flow.execute({ userId: "u1", ttlMinutes: 60 });
    expect(result).toEqual({
      ok: true,
      alreadyVerified: true,
      email: "user@example.com",
    });
  });

  it("issues verify token for unverified users", async () => {
    const users = mockUsers();
    const verify = mockVerifyEmailFlow();
    const flow = new VerifyEmailRequestFlow(users, verify);

    const result = await flow.execute({ userId: "u1", ttlMinutes: 60 });
    expect(result.ok).toBe(true);
    expect(result.alreadyVerified).toBe(false);
    expect(result.token).toBe("token_1");
    expect(verify.request).toHaveBeenCalledWith({
      userId: "u1",
      email: "user@example.com",
      ttlMinutes: 60,
    });
  });
});

