import type { OAuthProvider } from "@prisma/client";
import { OAuthAccountsRepo, UsersRepo } from "@db";

export class OAuthLoginFlow {
  constructor(
    private readonly users = new UsersRepo(),
    private readonly oauthAccounts = new OAuthAccountsRepo(),
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
      // provider without email (rare). You can force fetch primary email or fail.
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
