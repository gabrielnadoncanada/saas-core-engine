import type { UsersRepo } from "../auth.ports";
import { verifyPassword } from "../hashing/password";

export class LoginFlow {
  constructor(private readonly users: UsersRepo) {}

  async execute(params: { email: string; password: string }) {
    const email = params.email.toLowerCase();

    const user = await this.users.findByEmail(email);
    if (!user || !user.passwordHash) return { ok: false as const };

    const valid = await verifyPassword(user.passwordHash, params.password);
    if (!valid) return { ok: false as const };

    await this.users.touchLastLogin(user.id);

    return { ok: true as const, userId: user.id };
  }
}