import { hashIdentifier, hashTokenCandidates, type PepperInput } from "../hashing/token";
import { randomTokenBase64Url } from "../hashing/random";
import type {
  CreateSessionInput,
  CreateSessionResult,
  RotateSessionInput,
  RotateSessionResult,
  ValidateSessionInput,
  ValidSession,
} from "./session.types";
import type { SessionsRepo, TxRunner } from "../auth.ports";
import type { AuthEventEmitter } from "../events";
import { noOpAuthEventEmitter } from "../events";

export class SessionService {
  constructor(
    private readonly sessionsRepo: SessionsRepo,
    private readonly pepper: PepperInput,
    private readonly txRunner?: TxRunner,
    private readonly events: AuthEventEmitter = noOpAuthEventEmitter,
  ) {}

  private async createSessionInternal(
    input: CreateSessionInput,
    tx?: any,
  ): Promise<CreateSessionResult> {
    const sessionToken = randomTokenBase64Url(32);
    const tokenHash = hashIdentifier(sessionToken, this.pepper);

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + input.ttlDays * 24 * 60 * 60 * 1000,
    );

    const created = await this.sessionsRepo.create({
      userId: input.userId,
      tokenHash,
      expiresAt,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    }, tx);
    await this.events.emit({
      type: "auth.session.created",
      sessionId: created.id,
      userId: input.userId,
      at: now,
    });

    return { sessionToken, expiresAt };
  }

  async createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
    return this.createSessionInternal(input);
  }

  async validateSession(
    input: ValidateSessionInput,
  ): Promise<ValidSession | null> {
    let session = null;
    for (const tokenHash of hashTokenCandidates(input.sessionToken, this.pepper)) {
      session = await this.sessionsRepo.findActiveByTokenHash(tokenHash);
      if (session) break;
    }
    if (!session) return null;
    const now = Date.now();
    const lastSeenTs = session.lastSeenAt?.getTime() ?? session.createdAt.getTime();
    const idleTimeoutMs = (input.idleTimeoutMinutes ?? 0) * 60 * 1000;
    if (idleTimeoutMs > 0 && now - lastSeenTs > idleTimeoutMs) {
      await this.sessionsRepo.revokeSession(session.id);
      await this.events.emit({
        type: "auth.session.revoked",
        sessionId: session.id,
        at: new Date(),
      });
      return null;
    }
    if (now - lastSeenTs > 5 * 60 * 1000) {
      await this.sessionsRepo.touchLastSeen(session.id);
    }
    return { sessionId: session.id, userId: session.userId };
  }

  async rotateSession(
    input: RotateSessionInput,
  ): Promise<RotateSessionResult | null> {
    const rotate = async (tx?: any): Promise<RotateSessionResult | null> => {
      let current = null;
      for (const tokenHash of hashTokenCandidates(input.sessionToken, this.pepper)) {
        current = await this.sessionsRepo.findActiveByTokenHash(tokenHash, tx);
        if (current) break;
      }
      if (!current) return null;

      await this.sessionsRepo.revokeSession(current.id, tx);
      await this.events.emit({
        type: "auth.session.revoked",
        sessionId: current.id,
        at: new Date(),
      });
      const created = await this.createSessionInternal(
        {
          userId: current.userId,
          ttlDays: input.ttlDays,
          ip: input.ip ?? current.ip,
          userAgent: input.userAgent ?? current.userAgent,
        },
        tx,
      );

      return {
        ...created,
        userId: current.userId,
        previousSessionId: current.id,
      };
    };

    if (this.txRunner) {
      return this.txRunner.withTx((tx) => rotate(tx));
    }
    return rotate();
  }

  async revokeSession(sessionId: string, tx?: any): Promise<void> {
    await this.sessionsRepo.revokeSession(sessionId, tx);
    await this.events.emit({
      type: "auth.session.revoked",
      sessionId,
      at: new Date(),
    });
  }

  async revokeAllForUser(userId: string, tx?: any): Promise<void> {
    await this.sessionsRepo.revokeAllForUser(userId, tx);
  }

  async listActiveSessions(userId: string) {
    return this.sessionsRepo.listActiveByUser(userId);
  }
}
