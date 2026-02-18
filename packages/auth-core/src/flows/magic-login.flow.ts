import type { EmailTokenService } from "../email-tokens/email-token.service";
import type { TxRunner, UsersRepo } from "../auth.ports";
import { failResult, okResult } from "./flow-result";
import { createUserOrFindByEmailOnUnique } from "./user-create";

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
      if (!consumed) return failResult();
      if (consumed.type !== "magic_login") return failResult();

      let user = consumed.userId ? await this.users.findById(consumed.userId, tx) : null;

      if (!user) {
        user = await createUserOrFindByEmailOnUnique(
          this.users,
          {
            email: consumed.email,
            passwordHash: null,
          },
          tx,
        );
      }

      await this.users.markEmailVerified(user.id, tx);
      await this.users.touchLastLogin(user.id, tx);

      return okResult({ userId: user.id });
    });
  }
}
