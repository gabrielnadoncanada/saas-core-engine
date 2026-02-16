import type { EmailTokenService } from "../email-tokens/email-token.service";
import type { TxRunner, UsersRepo } from "../auth.ports";

export class MagicLoginFlow {
  constructor(
    private readonly tokens: EmailTokenService,
    private readonly users: UsersRepo,
    private readonly txRunner: TxRunner,
  ) {}

  async request(params: { email: string; ttlMinutes: number }) {
    const email = params.email.toLowerCase();
    const existing = await this.users.findByEmail(email);

    const issued = await this.tokens.issue({
      email,
      userId: existing?.id ?? null,
      type: "magic_login",
      ttlMinutes: params.ttlMinutes,
    });

    return { token: issued.token, expiresAt: issued.expiresAt };
  }

  async confirm(params: { token: string }) {
    return this.txRunner.withTx(async (tx) => {
      const consumed = await this.tokens.consume({ token: params.token }, tx);
      if (!consumed) return { ok: false as const };
      if (consumed.type !== "magic_login") return { ok: false as const };

      let user = consumed.userId ? await this.users.findById(consumed.userId, tx) : null;

      if (!user) {
        user = await this.users.create(
          {
            email: consumed.email,
            passwordHash: null,
          },
          tx,
        );
      }

      await this.users.markEmailVerified(user.id, tx);
      await this.users.touchLastLogin(user.id, tx);

      return { ok: true as const, userId: user.id };
    });
  }
}
