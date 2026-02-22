import { describe, it, expect, vi } from "vitest";
import { PasswordResetFlow } from "../../flows/password-reset.flow";
import type { EmailTokenService } from "../../email-tokens/email-token.service";
import type { SessionService } from "../../sessions/session.service";
import type { TxRunner, UsersRepo } from "../../auth.ports";

function mockUsers(overrides: Partial<UsersRepo> = {}): UsersRepo {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByEmail: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    markEmailVerified: vi.fn(),
    setPasswordHash: vi.fn().mockResolvedValue(undefined),
    touchLastLogin: vi.fn(),
    setActiveOrganization: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function mockTokens(overrides: Partial<EmailTokenService> = {}): EmailTokenService {
  return {
    issue: vi.fn().mockResolvedValue({ token: "raw-token", expiresAt: new Date() }),
    consume: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as EmailTokenService;
}

function mockSessions(): SessionService {
  return {
    revokeAllForUser: vi.fn().mockResolvedValue(undefined),
  } as unknown as SessionService;
}

const passThroughTx: TxRunner = {
  withTx: async <T>(fn: (tx: any) => Promise<T>) => fn({}),
};

describe("PasswordResetFlow", () => {
  describe("request", () => {
    it("returns ok:true with token for existing user", async () => {
      const users = mockUsers({
        findByEmail: vi.fn().mockResolvedValue({ id: "u1", email: "a@b.com", passwordHash: "h" }),
      });
      const tokens = mockTokens();

      const flow = new PasswordResetFlow(users, tokens, mockSessions(), passThroughTx);
      const res = await flow.request({ email: "a@b.com", ttlMinutes: 15 });

      expect(res.ok).toBe(true);
      expect(res).toHaveProperty("token", "raw-token");
      expect(tokens.issue).toHaveBeenCalledWith(
        expect.objectContaining({ type: "password_reset", userId: "u1" }),
      );
    });

    it("returns ok:true without token for non-existent user (anti-enumeration)", async () => {
      const flow = new PasswordResetFlow(
        mockUsers(),
        mockTokens(),
        mockSessions(),
        passThroughTx,
      );
      const res = await flow.request({ email: "nobody@x.com", ttlMinutes: 15 });

      expect(res).toEqual({ ok: true });
    });
  });

  describe("reset", () => {
    it("returns ok:false for invalid token", async () => {
      const flow = new PasswordResetFlow(
        mockUsers(),
        mockTokens(),
        mockSessions(),
        passThroughTx,
      );
      const res = await flow.reset({ token: "bad", newPassword: "new-password-123" });
      expect(res.ok).toBe(false);
    });

    it("returns ok:false for wrong token type", async () => {
      const tokens = mockTokens({
        consume: vi.fn().mockResolvedValue({
          id: "et-1",
          email: "a@b.com",
          userId: "u1",
          type: "magic_login",
        }),
      });

      const flow = new PasswordResetFlow(
        mockUsers(),
        tokens,
        mockSessions(),
        passThroughTx,
      );
      const res = await flow.reset({ token: "t", newPassword: "new-password-123" });
      expect(res.ok).toBe(false);
    });

    it("updates password and revokes all sessions on success", async () => {
      const users = mockUsers();
      const sessions = mockSessions();
      const tokens = mockTokens({
        consume: vi.fn().mockResolvedValue({
          id: "et-1",
          email: "a@b.com",
          userId: "u1",
          type: "password_reset",
        }),
      });

      const flow = new PasswordResetFlow(users, tokens, sessions, passThroughTx);
      const res = await flow.reset({ token: "t", newPassword: "new-password-123" });

      expect(res).toEqual({ ok: true, userId: "u1" });
      expect(tokens.consume).toHaveBeenCalledWith({ token: "t" }, expect.any(Object));
      expect(users.setPasswordHash).toHaveBeenCalledWith("u1", expect.any(String), expect.any(Object));
      expect(sessions.revokeAllForUser).toHaveBeenCalledWith("u1", expect.any(Object));
    });
  });
});
