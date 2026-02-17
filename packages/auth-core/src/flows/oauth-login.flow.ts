import type { OAuthProvider } from "@contracts";
import type { OAuthAccountsRepo, UsersRepo } from "../auth.ports";
import { authErr, isUniqueConstraintViolation } from "../errors";
import type { AuthEventEmitter } from "../events";
import { noOpAuthEventEmitter } from "../events";

export class OAuthLoginFlow {
  constructor(
    private readonly users: UsersRepo,
    private readonly oauthAccounts: OAuthAccountsRepo,
    private readonly events: AuthEventEmitter = noOpAuthEventEmitter,
  ) {}

  async linkOrCreate(params: {
    provider: OAuthProvider;
    providerAccountId: string;
    email?: string | null;
    emailVerified?: boolean;
  }): Promise<{ userId: string }> {
    const existingAccount = await this.oauthAccounts.findByProviderAccount({
      provider: params.provider,
      providerAccountId: params.providerAccountId,
    });

    if (existingAccount) return { userId: existingAccount.userId };

    const email = params.email?.toLowerCase() ?? null;
    if (!email || !params.emailVerified) {
      throw authErr("unauthorized", "OAuth email is missing or unverified");
    }
    let user = await this.users.findByEmail(email);

    if (!user) {
      try {
        user = await this.users.create({ email, passwordHash: null });
      } catch (error) {
        if (!isUniqueConstraintViolation(error)) throw error;
        user = await this.users.findByEmail(email);
        if (!user) throw error;
      }
    }

    await this.oauthAccounts.create({
      userId: user.id,
      provider: params.provider,
      providerAccountId: params.providerAccountId,
      email,
    });
    await this.events.emit({
      type: "auth.oauth.linked",
      userId: user.id,
      provider: params.provider,
      at: new Date(),
    });

    await this.users.markEmailVerified(user.id);

    await this.users.touchLastLogin(user.id);

    return { userId: user.id };
  }
}
