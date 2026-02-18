import type { EmailTokenService } from "../email-tokens/email-token.service";
import type { TxRunner, UsersRepo } from "../auth.ports";
import type { AuthEventEmitter } from "../events";
import { noOpAuthEventEmitter } from "../events";
import { failResult, okResult } from "./flow-result";

export class VerifyEmailFlow {
  constructor(
    private readonly tokens: EmailTokenService,
    private readonly users: UsersRepo,
    private readonly txRunner?: TxRunner,
    private readonly events: AuthEventEmitter = noOpAuthEventEmitter,
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
    await this.events.emit({
      type: "auth.verify_email.requested",
      userId: params.userId,
      at: new Date(),
    });

    return { token: issued.token, expiresAt: issued.expiresAt };
  }

  async confirm(params: { token: string }) {
    const confirm = async (tx?: any) => {
      const consumed = await this.tokens.consume({ token: params.token }, tx);
      if (!consumed) return failResult();

      if (consumed.type !== "verify_email") return failResult();
      if (!consumed.userId) return failResult();

      await this.users.markEmailVerified(consumed.userId, tx);

      return okResult({ userId: consumed.userId });
    };

    if (this.txRunner) {
      return this.txRunner.withTx((tx) => confirm(tx));
    }
    return confirm();
  }
}
