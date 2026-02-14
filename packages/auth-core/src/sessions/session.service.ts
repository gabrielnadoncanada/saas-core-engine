import { SessionsRepo } from "@db";
import { hashToken } from "../hashing/token";
import { randomTokenBase64Url } from "../hashing/random";
import type {
  CreateSessionInput,
  CreateSessionResult,
  ValidateSessionInput,
  ValidSession,
} from "./session.types";

export class SessionService {
  constructor(private readonly sessionsRepo = new SessionsRepo()) {}

  async createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
    const sessionToken = randomTokenBase64Url(32);
    const tokenHash = hashToken(sessionToken, input.pepper);

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + input.ttlDays * 24 * 60 * 60 * 1000,
    );

    await this.sessionsRepo.create({
      userId: input.userId,
      tokenHash,
      expiresAt,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    });

    return { sessionToken, expiresAt };
  }

  async validateSession(
    input: ValidateSessionInput,
  ): Promise<ValidSession | null> {
    const tokenHash = hashToken(input.sessionToken, input.pepper);
    const session = await this.sessionsRepo.findActiveByTokenHash(tokenHash);
    if (!session) return null;
    return { sessionId: session.id, userId: session.userId };
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionsRepo.revokeSession(sessionId);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.sessionsRepo.revokeAllForUser(userId);
  }

  async listActiveSessions(userId: string) {
    return this.sessionsRepo.listActiveByUser(userId);
  }
}
