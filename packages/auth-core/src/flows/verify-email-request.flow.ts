import { authErr } from "../errors";
import type { UsersRepo } from "../auth.ports";
import type { VerifyEmailFlow } from "./verify-email.flow";

export class VerifyEmailRequestFlow {
  constructor(
    private readonly users: UsersRepo,
    private readonly verifyEmail: VerifyEmailFlow,
  ) {}

  async execute(params: { userId: string; ttlMinutes: number }) {
    const user = await this.users.findById(params.userId);
    if (!user) throw authErr("unauthorized", "User not found");

    if (user.emailVerifiedAt) {
      return { ok: true as const, alreadyVerified: true as const, email: user.email };
    }

    const issued = await this.verifyEmail.request({
      userId: params.userId,
      email: user.email,
      ttlMinutes: params.ttlMinutes,
    });

    return {
      ok: true as const,
      alreadyVerified: false as const,
      email: user.email,
      token: issued.token,
      expiresAt: issued.expiresAt,
    };
  }
}

