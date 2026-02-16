import type { UsersRepo } from "../auth.ports";
import { verifyPassword } from "../hashing/password";
import type { AuthEventEmitter } from "../events";
import { noOpAuthEventEmitter } from "../events";

export class LoginFlow {
  constructor(
    private readonly users: UsersRepo,
    private readonly events: AuthEventEmitter = noOpAuthEventEmitter,
  ) {}

  async execute(params: { email: string; password: string }) {
    const email = params.email.toLowerCase();

    const user = await this.users.findByEmail(email);
    if (!user || !user.passwordHash) {
      await this.events.emit({ type: "auth.login.failed", email, at: new Date() });
      return { ok: false as const };
    }

    const valid = await verifyPassword(user.passwordHash, params.password);
    if (!valid) {
      await this.events.emit({ type: "auth.login.failed", email, at: new Date() });
      return { ok: false as const };
    }

    await this.users.touchLastLogin(user.id);
    await this.events.emit({
      type: "auth.login.succeeded",
      userId: user.id,
      at: new Date(),
    });

    return { ok: true as const, userId: user.id };
  }
}
