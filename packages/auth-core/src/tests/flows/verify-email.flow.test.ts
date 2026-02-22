import { describe, it, expect, vi } from "vitest";
import { VerifyEmailFlow } from "../../flows/verify-email.flow";
import type { EmailTokenService } from "../../email-tokens/email-token.service";
import type { TxRunner, UsersRepo } from "../../auth.ports";

function mockTokens(overrides: Partial<EmailTokenService> = {}): EmailTokenService {
  return {
    issue: vi.fn().mockResolvedValue({ token: "raw-token", expiresAt: new Date() }),
    consume: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as EmailTokenService;
}

function mockUsers(): UsersRepo {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByEmail: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    markEmailVerified: vi.fn().mockResolvedValue(undefined),
    setPasswordHash: vi.fn(),
    touchLastLogin: vi.fn(),
    setActiveOrganization: vi.fn().mockResolvedValue(undefined),
  };
}

describe("VerifyEmailFlow", () => {
  describe("request", () => {
    it("issues a verify_email token", async () => {
      const tokens = mockTokens();
      const flow = new VerifyEmailFlow(tokens, mockUsers());

      const res = await flow.request({ userId: "u1", email: "A@B.com", ttlMinutes: 60 });

      expect(res.token).toBe("raw-token");
      expect(tokens.issue).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "a@b.com",
          userId: "u1",
          type: "verify_email",
          ttlMinutes: 60,
        }),
      );
    });
  });

  describe("confirm", () => {
    it("returns ok:false for invalid token", async () => {
      const flow = new VerifyEmailFlow(mockTokens(), mockUsers());
      expect(await flow.confirm({ token: "bad" })).toEqual({ ok: false });
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

      const flow = new VerifyEmailFlow(tokens, mockUsers());
      expect(await flow.confirm({ token: "t" })).toEqual({ ok: false });
    });

    it("returns ok:false if no userId on token", async () => {
      const tokens = mockTokens({
        consume: vi.fn().mockResolvedValue({
          id: "et-1",
          email: "a@b.com",
          userId: null,
          type: "verify_email",
        }),
      });

      const flow = new VerifyEmailFlow(tokens, mockUsers());
      expect(await flow.confirm({ token: "t" })).toEqual({ ok: false });
    });

    it("marks email verified on success", async () => {
      const users = mockUsers();
      const tokens = mockTokens({
        consume: vi.fn().mockResolvedValue({
          id: "et-1",
          email: "a@b.com",
          userId: "u1",
          type: "verify_email",
        }),
      });

      const flow = new VerifyEmailFlow(tokens, users);
      const res = await flow.confirm({ token: "t" });

      expect(res).toEqual({ ok: true, userId: "u1" });
      expect(users.markEmailVerified).toHaveBeenCalledWith("u1", undefined);
    });

    it("uses transaction when txRunner is provided", async () => {
      const users = mockUsers();
      const tokens = mockTokens({
        consume: vi.fn().mockResolvedValue({
          id: "et-1",
          email: "a@b.com",
          userId: "u1",
          type: "verify_email",
        }),
      });
      const txRunner: TxRunner = {
        withTx: vi.fn((fn) => fn({ tx: true })) as TxRunner["withTx"],
      };

      const flow = new VerifyEmailFlow(tokens, users, txRunner);
      const res = await flow.confirm({ token: "t" });

      expect(res).toEqual({ ok: true, userId: "u1" });
      expect(txRunner.withTx).toHaveBeenCalledTimes(1);
      expect(tokens.consume).toHaveBeenCalledWith({ token: "t" }, { tx: true });
      expect(users.markEmailVerified).toHaveBeenCalledWith("u1", { tx: true });
    });
  });
});
