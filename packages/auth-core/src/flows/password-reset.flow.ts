import type { EmailTokenService } from "../email-tokens/email-token.service";
import type { SessionService } from "../sessions/session.service";
import type { UsersRepo } from "../auth.ports";
import { hashPassword } from "../hashing/password";

export class PasswordResetFlow {
  constructor(
    private readonly users: UsersRepo,
    private readonly tokens: EmailTokenService,
    private readonly sessions: SessionService,
  ) {}

  async request(params: { email: string; ttlMinutes: number }) {
    const email = params.email.toLowerCase();
    const user = await this.users.findByEmail(email);

    if (!user) {
      return { ok: true as const };
    }

    const issued = await this.tokens.issue({
      email,
      userId: user.id,
      type: "password_reset",
      ttlMinutes: params.ttlMinutes,
    });

    return {
      ok: true as const,
      token: issued.token,
      expiresAt: issued.expiresAt,
    };
  }

  async reset(params: { token: string; newPassword: string }) {
    const consumed = await this.tokens.consume({ token: params.token });
    if (!consumed || consumed.type !== "password_reset" || !consumed.userId) {
      return { ok: false as const };
    }

    const passwordHash = await hashPassword(params.newPassword);
    await this.users.setPasswordHash(consumed.userId, passwordHash);
    await this.sessions.revokeAllForUser(consumed.userId);

    return { ok: true as const, userId: consumed.userId };
  }
}