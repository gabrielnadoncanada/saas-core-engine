import type { EmailTokenService } from "../email-tokens/email-token.service";
import type { TxRunner, UsersRepo } from "../auth.ports";

export class VerifyEmailFlow {
  constructor(
    private readonly tokens: EmailTokenService,
    private readonly users: UsersRepo,
    private readonly txRunner?: TxRunner,
  ) {}

  async request(params: {
    userId: string;
    email: string;
    ttlMinutes: number;
  }) {
    const email = params.email.toLowerCase();

    const issued = await this.tokens.issue({
      email,
      userId: params.userId,
      type: "verify_email",
      ttlMinutes: params.ttlMinutes,
    });

    return { token: issued.token, expiresAt: issued.expiresAt };
  }

  async confirm(params: { token: string }) {
    const confirm = async (tx?: any) => {
      const consumed = await this.tokens.consume({ token: params.token }, tx);
      if (!consumed) return { ok: false as const };

      if (consumed.type !== "verify_email") return { ok: false as const };
      if (!consumed.userId) return { ok: false as const };

      await this.users.markEmailVerified(consumed.userId, tx);

      return { ok: true as const, userId: consumed.userId };
    };

    if (this.txRunner) {
      return this.txRunner.withTx((tx) => confirm(tx));
    }
    return confirm();
  }
}
