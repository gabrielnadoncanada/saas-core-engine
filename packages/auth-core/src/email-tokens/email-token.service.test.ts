import { describe, it, expect, vi } from "vitest";
import { EmailTokenService } from "./email-token.service";
import type { EmailTokenRepo } from "../auth.ports";

function mockEmailTokenRepo(): EmailTokenRepo {
  return {
    create: vi.fn().mockResolvedValue({ id: "et-1" }),
    findValidByTokenHash: vi.fn().mockResolvedValue(null),
    markUsedIfUnused: vi.fn().mockResolvedValue(true),
  };
}

const PEPPER = "test-pepper-long-enough-for-validation";

describe("EmailTokenService", () => {
  describe("issue", () => {
    it("returns a raw token and expiry", async () => {
      const repo = mockEmailTokenRepo();
      const svc = new EmailTokenService(repo, PEPPER);

      const result = await svc.issue({
        email: "test@example.com",
        type: "magic_login",
        ttlMinutes: 15,
      });

      expect(result.token).toBeTruthy();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(repo.create).toHaveBeenCalledOnce();
    });

    it("stores a hashed token", async () => {
      const repo = mockEmailTokenRepo();
      const svc = new EmailTokenService(repo, PEPPER);

      const result = await svc.issue({
        email: "a@b.com",
        type: "password_reset",
        ttlMinutes: 10,
      });

      const call = (repo.create as any).mock.calls[0][0];
      expect(call.tokenHash).not.toBe(result.token);
      expect(call.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("passes userId and type to repo", async () => {
      const repo = mockEmailTokenRepo();
      const svc = new EmailTokenService(repo, PEPPER);

      await svc.issue({
        email: "a@b.com",
        userId: "u1",
        type: "verify_email",
        ttlMinutes: 60,
      });

      const call = (repo.create as any).mock.calls[0][0];
      expect(call.userId).toBe("u1");
      expect(call.type).toBe("verify_email");
    });

    it("clamps ttl for password reset to safe max", async () => {
      const repo = mockEmailTokenRepo();
      const svc = new EmailTokenService(repo, PEPPER);

      await svc.issue({
        email: "a@b.com",
        type: "password_reset",
        ttlMinutes: 180,
      });

      const call = (repo.create as any).mock.calls[0][0];
      const ttlMs = call.expiresAt.getTime() - Date.now();
      expect(ttlMs).toBeLessThanOrEqual(20 * 60 * 1000 + 3_000);
    });
  });

  describe("consume", () => {
    it("returns null when token not found", async () => {
      const repo = mockEmailTokenRepo();
      const svc = new EmailTokenService(repo, PEPPER);

      const result = await svc.consume({ token: "invalid" });
      expect(result).toBeNull();
      expect(repo.markUsedIfUnused).not.toHaveBeenCalled();
    });

    it("returns consumed token and marks it used", async () => {
      const repo = mockEmailTokenRepo();
      (repo.findValidByTokenHash as any).mockResolvedValue({
        id: "et-1",
        email: "a@b.com",
        userId: "u1",
        type: "magic_login",
      });
      const svc = new EmailTokenService(repo, PEPPER);

      const result = await svc.consume({ token: "some-token" });

      expect(result).toEqual({
        id: "et-1",
        email: "a@b.com",
        userId: "u1",
        type: "magic_login",
      });
      expect(repo.markUsedIfUnused).toHaveBeenCalledWith("et-1", undefined);
    });

    it("returns null when token was already consumed concurrently", async () => {
      const repo = mockEmailTokenRepo();
      (repo.findValidByTokenHash as any).mockResolvedValue({
        id: "et-1",
        email: "a@b.com",
        userId: "u1",
        type: "magic_login",
      });
      (repo.markUsedIfUnused as any).mockResolvedValue(false);
      const svc = new EmailTokenService(repo, PEPPER);

      const result = await svc.consume({ token: "some-token" });

      expect(result).toBeNull();
    });
  });
});
