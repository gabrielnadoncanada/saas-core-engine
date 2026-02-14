import { UsersRepo } from "@db";
import { EmailTokenService } from "../email-tokens/email-token.service";
import { hashPassword } from "../hashing/password";
import { SessionService } from "../sessions/session.service";

export class PasswordResetFlow {
  constructor(
    private readonly users = new UsersRepo(),
    private readonly tokens = new EmailTokenService(),
    private readonly sessions = new SessionService(),
  ) {}

  async request(params: { email: string; pepper: string; ttlMinutes: number }) {
    const email = params.email.toLowerCase();
    const user = await this.users.findByEmail(email);

    // Always act as if success to prevent enumeration
    if (!user) {
      return { ok: true as const };
    }

    const issued = await this.tokens.issue({
      email,
      userId: user.id,
      type: "password_reset",
      ttlMinutes: params.ttlMinutes,
      pepper: params.pepper,
    });

    return {
      ok: true as const,
      token: issued.token,
      expiresAt: issued.expiresAt,
    };
  }

  async reset(params: { token: string; newPassword: string; pepper: string }) {
    const consumed = await this.tokens.consume({
      token: params.token,
      pepper: params.pepper,
    });
    if (!consumed || consumed.type !== "password_reset" || !consumed.userId) {
      return { ok: false as const };
    }

    const passwordHash = await hashPassword(params.newPassword);
    await this.users.setPasswordHash(consumed.userId, passwordHash);

    // revoke all sessions after password reset
    await this.sessions.revokeAllForUser(consumed.userId);

    return { ok: true as const, userId: consumed.userId };
  }
}
