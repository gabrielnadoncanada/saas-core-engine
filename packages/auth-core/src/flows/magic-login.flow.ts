import { UsersRepo } from "@db";
import { EmailTokenService } from "../email-tokens/email-token.service";

export class MagicLoginFlow {
  constructor(
    private readonly tokens = new EmailTokenService(),
    private readonly users = new UsersRepo(),
  ) {}

  async request(params: { email: string; pepper: string; ttlMinutes: number }) {
    const email = params.email.toLowerCase();
    const existing = await this.users.findByEmail(email);

    const issued = await this.tokens.issue({
      email,
      userId: existing?.id ?? null,
      type: "magic_login",
      ttlMinutes: params.ttlMinutes,
      pepper: params.pepper,
    });

    return { token: issued.token, expiresAt: issued.expiresAt };
  }

  async confirm(params: { token: string; pepper: string }) {
    const consumed = await this.tokens.consume({
      token: params.token,
      pepper: params.pepper,
    });
    if (!consumed) return { ok: false as const };

    if (consumed.type !== "magic_login") return { ok: false as const };

    let user = consumed.userId
      ? await this.users.findById(consumed.userId)
      : null;

    if (!user) {
      user = await this.users.create({
        email: consumed.email,
        passwordHash: null,
      });
    }

    // If magic link is used, consider email verified
    await this.users.markEmailVerified(user.id);
    await this.users.touchLastLogin(user.id);

    return { ok: true as const, userId: user.id };
  }
}
