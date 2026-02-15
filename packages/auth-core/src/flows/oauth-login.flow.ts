import type { OAuthProvider } from "@contracts";
import type { OAuthAccountsRepo, UsersRepo } from "../auth.ports";

export class OAuthLoginFlow {
  constructor(
    private readonly users: UsersRepo,
    private readonly oauthAccounts: OAuthAccountsRepo,
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
    let user = email ? await this.users.findByEmail(email) : null;

    if (!user && email) {
      user = await this.users.create({ email, passwordHash: null });
    }

    if (!user) {
      throw new Error("OAuth provider did not return an email");
    }

    await this.oauthAccounts.create({
      userId: user.id,
      provider: params.provider,
      providerAccountId: params.providerAccountId,
      email,
    });

    if (params.emailVerified) {
      await this.users.markEmailVerified(user.id);
    }

    await this.users.touchLastLogin(user.id);

    return { userId: user.id };
  }
}