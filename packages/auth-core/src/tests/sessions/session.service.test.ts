import { describe, it, expect, vi } from "vitest";
import { SessionService } from "./session.service";
import type { SessionsRepo, TxRunner } from "../auth.ports";

function mockSessionsRepo(): SessionsRepo {
  return {
    create: vi.fn().mockResolvedValue({ id: "sess-1" }),
    findActiveByTokenHash: vi.fn().mockResolvedValue(null),
    listActiveByUser: vi.fn().mockResolvedValue([]),
    touchLastSeen: vi.fn().mockResolvedValue(undefined),
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
        createdAt: new Date(Date.now() - 60_000),
        lastSeenAt: new Date(),
      });
      const svc = new SessionService(repo, PEPPER);

      const result = await svc.validateSession({ sessionToken: "token" });
      expect(result).toEqual({ sessionId: "sess-1", userId: "u1" });
    });

    it("revokes and returns null when idle timeout exceeded", async () => {
      const repo = mockSessionsRepo();
      (repo.findActiveByTokenHash as any).mockResolvedValue({
        id: "sess-1",
        userId: "u1",
        createdAt: new Date(Date.now() - 30 * 60_000),
        lastSeenAt: new Date(Date.now() - 30 * 60_000),
      });
      const svc = new SessionService(repo, PEPPER);

      const result = await svc.validateSession({
        sessionToken: "token",
        idleTimeoutMinutes: 10,
      });
      expect(result).toBeNull();
      expect(repo.revokeSession).toHaveBeenCalledWith("sess-1");
    });

    it("touches lastSeen when stale", async () => {
      const repo = mockSessionsRepo();
      (repo.findActiveByTokenHash as any).mockResolvedValue({
        id: "sess-1",
        userId: "u1",
        createdAt: new Date(Date.now() - 10 * 60_000),
        lastSeenAt: new Date(Date.now() - 10 * 60_000),
      });
      const svc = new SessionService(repo, PEPPER);

      await svc.validateSession({ sessionToken: "token" });
      expect(repo.touchLastSeen).toHaveBeenCalledWith("sess-1");
    });
  });

  describe("revokeSession", () => {
    it("delegates to repo", async () => {
      const repo = mockSessionsRepo();
      const svc = new SessionService(repo, PEPPER);
      await svc.revokeSession("sess-1");
      expect(repo.revokeSession).toHaveBeenCalledWith("sess-1", undefined);
    });
  });

  describe("revokeAllForUser", () => {
    it("delegates to repo", async () => {
      const repo = mockSessionsRepo();
      const svc = new SessionService(repo, PEPPER);
      await svc.revokeAllForUser("u1");
      expect(repo.revokeAllForUser).toHaveBeenCalledWith("u1", undefined);
    });
  });

  describe("rotateSession", () => {
    const passThroughTx: TxRunner = {
      withTx: async <T>(fn: (tx: any) => Promise<T>) => fn({ tx: true }),
    };

    it("returns null when current session is invalid", async () => {
      const repo = mockSessionsRepo();
      const svc = new SessionService(repo, PEPPER, passThroughTx);

      const result = await svc.rotateSession({
        sessionToken: "invalid",
        ttlDays: 7,
      });
      expect(result).toBeNull();
    });

    it("revokes old session and creates a new one", async () => {
      const repo = mockSessionsRepo();
      (repo.findActiveByTokenHash as any).mockResolvedValue({
        id: "sess-old",
        userId: "u1",
        createdAt: new Date(),
        lastSeenAt: new Date(),
        ip: "127.0.0.1",
        userAgent: "UA",
      });
      (repo.create as any)
        .mockResolvedValueOnce({ id: "sess-new" });
      const svc = new SessionService(repo, PEPPER, passThroughTx);

      const result = await svc.rotateSession({
        sessionToken: "valid-token",
        ttlDays: 7,
      });

      expect(result?.userId).toBe("u1");
      expect(result?.previousSessionId).toBe("sess-old");
      expect(result?.sessionToken).toBeTruthy();
      expect(repo.revokeSession).toHaveBeenCalledWith("sess-old", expect.any(Object));
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "u1" }),
        expect.any(Object),
      );
    });
  });
});
