import { describe, it, expect, vi } from "vitest";
import { SessionService } from "./session.service";
import type { SessionsRepo } from "../auth.ports";

function mockSessionsRepo(): SessionsRepo {
  return {
    create: vi.fn().mockResolvedValue({ id: "sess-1" }),
    findActiveByTokenHash: vi.fn().mockResolvedValue(null),
    listActiveByUser: vi.fn().mockResolvedValue([]),
    revokeSession: vi.fn().mockResolvedValue(undefined),
    revokeAllForUser: vi.fn().mockResolvedValue(undefined),
  };
}

const PEPPER = "test-pepper-long-enough-for-validation";

describe("SessionService", () => {
  describe("createSession", () => {
    it("returns a session token and expiry", async () => {
      const repo = mockSessionsRepo();
      const svc = new SessionService(repo, PEPPER);

      const result = await svc.createSession({ userId: "u1", ttlDays: 7 });

      expect(result.sessionToken).toBeTruthy();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(repo.create).toHaveBeenCalledOnce();
    });

    it("stores a hashed token, not the raw token", async () => {
      const repo = mockSessionsRepo();
      const svc = new SessionService(repo, PEPPER);

      const result = await svc.createSession({ userId: "u1", ttlDays: 1 });
      const call = (repo.create as any).mock.calls[0][0];

      expect(call.tokenHash).toBeTruthy();
      expect(call.tokenHash).not.toBe(result.sessionToken);
    });
  });

  describe("validateSession", () => {
    it("returns null when no session found", async () => {
      const repo = mockSessionsRepo();
      const svc = new SessionService(repo, PEPPER);

      const result = await svc.validateSession({ sessionToken: "unknown" });
      expect(result).toBeNull();
    });

    it("returns userId and sessionId for valid session", async () => {
      const repo = mockSessionsRepo();
      (repo.findActiveByTokenHash as any).mockResolvedValue({
        id: "sess-1",
        userId: "u1",
      });
      const svc = new SessionService(repo, PEPPER);

      const result = await svc.validateSession({ sessionToken: "token" });
      expect(result).toEqual({ sessionId: "sess-1", userId: "u1" });
    });
  });

  describe("revokeSession", () => {
    it("delegates to repo", async () => {
      const repo = mockSessionsRepo();
      const svc = new SessionService(repo, PEPPER);
      await svc.revokeSession("sess-1");
      expect(repo.revokeSession).toHaveBeenCalledWith("sess-1");
    });
  });

  describe("revokeAllForUser", () => {
    it("delegates to repo", async () => {
      const repo = mockSessionsRepo();
      const svc = new SessionService(repo, PEPPER);
      await svc.revokeAllForUser("u1");
      expect(repo.revokeAllForUser).toHaveBeenCalledWith("u1");
    });
  });
});
