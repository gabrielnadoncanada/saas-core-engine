import { describe, it, expect, vi } from "vitest";
import { MagicLoginFlow } from "./magic-login.flow";
import type { EmailTokenService } from "../email-tokens/email-token.service";
import type { UsersRepo } from "../auth.ports";

function mockTokens(overrides: Partial<EmailTokenService> = {}): EmailTokenService {
  return {
    issue: vi.fn().mockResolvedValue({ token: "raw-token", expiresAt: new Date() }),
    consume: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as EmailTokenService;
}

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

describe("MagicLoginFlow", () => {
  describe("request", () => {
    it("issues a magic_login token", async () => {
      const tokens = mockTokens();
      const users = mockUsers({
        findByEmail: vi.fn().mockResolvedValue({ id: "u1", email: "a@b.com", passwordHash: null }),
      });

      const flow = new MagicLoginFlow(tokens, users);
      const res = await flow.request({ email: "A@B.com", ttlMinutes: 15 });

      expect(res.token).toBe("raw-token");
      expect(tokens.issue).toHaveBeenCalledWith(
        expect.objectContaining({ email: "a@b.com", type: "magic_login" }),
      );
    });
  });

  describe("confirm", () => {
    it("returns ok:false for invalid token", async () => {
      const flow = new MagicLoginFlow(mockTokens(), mockUsers());
      const res = await flow.confirm({ token: "bad" });
      expect(res.ok).toBe(false);
    });

    it("returns ok:false for wrong token type", async () => {
      const tokens = mockTokens({
        consume: vi.fn().mockResolvedValue({
          id: "et-1",
          email: "a@b.com",
          userId: "u1",
          type: "password_reset",
        }),
      });

      const flow = new MagicLoginFlow(tokens, mockUsers());
      const res = await flow.confirm({ token: "t" });
      expect(res.ok).toBe(false);
    });

    it("auto-creates user if none exists", async () => {
      const users = mockUsers();
      const tokens = mockTokens({
        consume: vi.fn().mockResolvedValue({
          id: "et-1",
          email: "new@b.com",
          userId: null,
          type: "magic_login",
        }),
      });

      const flow = new MagicLoginFlow(tokens, users);
      const res = await flow.confirm({ token: "t" });

      expect(res.ok).toBe(true);
      expect(users.create).toHaveBeenCalledWith({
        email: "new@b.com",
        passwordHash: null,
      });
      expect(users.markEmailVerified).toHaveBeenCalled();
    });

    it("returns existing userId on confirm", async () => {
      const users = mockUsers({
        findById: vi.fn().mockResolvedValue({ id: "u1", email: "a@b.com", passwordHash: null }),
      });
      const tokens = mockTokens({
        consume: vi.fn().mockResolvedValue({
          id: "et-1",
          email: "a@b.com",
          userId: "u1",
          type: "magic_login",
        }),
      });

      const flow = new MagicLoginFlow(tokens, users);
      const res = await flow.confirm({ token: "t" });

      expect(res).toEqual({ ok: true, userId: "u1" });
      expect(users.touchLastLogin).toHaveBeenCalledWith("u1");
    });
  });
});
