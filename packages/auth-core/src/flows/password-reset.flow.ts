import type { EmailTokenService } from "../email-tokens/email-token.service";
import type { SessionService } from "../sessions/session.service";
import type { TxRunner, UsersRepo } from "../auth.ports";
import { hashPassword } from "../hashing/password";
import type { AuthEventEmitter } from "../events";
import { noOpAuthEventEmitter } from "../events";

export class PasswordResetFlow {
  constructor(
    private readonly users: UsersRepo,
    private readonly tokens: EmailTokenService,
    private readonly sessions: SessionService,
    private readonly txRunner: TxRunner,
    private readonly events: AuthEventEmitter = noOpAuthEventEmitter,
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
    await this.events.emit({
      type: "auth.password_reset.requested",
      userId: user.id,
      at: new Date(),
    });

    return {
      ok: true as const,
      token: issued.token,
      expiresAt: issued.expiresAt,
    };
  }

  async reset(params: { token: string; newPassword: string }) {
    return this.txRunner.withTx(async (tx) => {
      const consumed = await this.tokens.consume({ token: params.token }, tx);
      if (!consumed || consumed.type !== "password_reset" || !consumed.userId) {
        return { ok: false as const };
      }

      const passwordHash = await hashPassword(params.newPassword);
      await this.users.setPasswordHash(consumed.userId, passwordHash, tx);
      await this.sessions.revokeAllForUser(consumed.userId, tx);
      await this.events.emit({
        type: "auth.password_reset.completed",
        userId: consumed.userId,
        at: new Date(),
      });

      return { ok: true as const, userId: consumed.userId };
    });
  }
}
