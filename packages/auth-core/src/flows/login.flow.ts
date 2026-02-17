import type { UsersRepo } from "../auth.ports";
import {
  getDummyPasswordHash,
  hashPassword,
  passwordNeedsRehash,
  verifyPassword,
} from "../hashing/password";
import type { AuthEventEmitter } from "../events";
import { noOpAuthEventEmitter } from "../events";
import { sha256Hex } from "../hashing/token";

export class LoginFlow {
  constructor(
    private readonly users: UsersRepo,
    private readonly events: AuthEventEmitter = noOpAuthEventEmitter,
  ) {}

  async execute(params: { email: string; password: string }) {
    const email = params.email.toLowerCase();
    const emailHash = sha256Hex(email);

    const user = await this.users.findByEmail(email);
    if (!user || !user.passwordHash) {
      const dummyHash = await getDummyPasswordHash();
      await verifyPassword(dummyHash, params.password);
      await this.events.emit({ type: "auth.login.failed", emailHash, at: new Date() });
      return { ok: false as const };
    }

    const valid = await verifyPassword(user.passwordHash, params.password);
    if (!valid) {
      await this.events.emit({ type: "auth.login.failed", emailHash, at: new Date() });
      return { ok: false as const };
    }

    if (passwordNeedsRehash(user.passwordHash)) {
      try {
        const upgradedHash = await hashPassword(params.password);
        await this.users.setPasswordHash(user.id, upgradedHash);
      } catch {
        // Best-effort upgrade: don't block a successful login.
      }
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
