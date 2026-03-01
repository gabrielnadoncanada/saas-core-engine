import "server-only";

import type { OAuthProvider } from "@contracts";

import { env } from "@/server/config/env";

export type SignInMethodProvider = "email" | OAuthProvider;

export type SignInMethod = {
  provider: SignInMethodProvider;
  label: string;
  connected: boolean;
  linkedIdentifier?: string;
  lastUsedAt?: string;
  action: "connect" | "manage" | "disconnect";
  canDisconnect: boolean;
};

const OAUTH_PROVIDER_CONFIG: Record<OAuthProvider, { label: string; enabled: () => boolean }> = {
  google: {
    label: "Google",
    enabled: () =>
      env.AUTH_SIGNIN_GOOGLE_ENABLED &&
      Boolean(
        env.GOOGLE_OAUTH_CLIENT_ID &&
          env.GOOGLE_OAUTH_CLIENT_SECRET &&
          env.GOOGLE_OAUTH_REDIRECT_URI,
      ),
  },
  github: {
    label: "GitHub",
    enabled: () =>
      env.AUTH_SIGNIN_GITHUB_ENABLED &&
      Boolean(
        env.GITHUB_OAUTH_CLIENT_ID &&
          env.GITHUB_OAUTH_CLIENT_SECRET &&
          env.GITHUB_OAUTH_REDIRECT_URI,
      ),
  },
};

export function isOAuthProviderEnabled(provider: OAuthProvider): boolean {
  return OAUTH_PROVIDER_CONFIG[provider].enabled();
}

export function enabledOAuthProviders(): OAuthProvider[] {
  return (Object.keys(OAUTH_PROVIDER_CONFIG) as OAuthProvider[]).filter((provider) =>
    isOAuthProviderEnabled(provider),
  );
}

export type UserSignInData = {
  email: string;
  passwordHash: string | null;
  oauthAccounts: Array<{
    provider: string;
    email: string | null;
    providerAccountId: string;
    lastUsedAt: Date | null;
  }>;
};

export function buildSignInMethods(user: UserSignInData): SignInMethod[] {
  const methods: SignInMethod[] = [];
  const connectedCount =
    (user.passwordHash ? 1 : 0) + user.oauthAccounts.length;

  if (env.AUTH_SIGNIN_EMAIL_ENABLED) {
    methods.push({
      provider: "email",
      label: "Email",
      connected: Boolean(user.passwordHash),
      linkedIdentifier: user.email || undefined,
      action: "manage",
      canDisconnect: connectedCount > 1,
    });
  }

  for (const provider of enabledOAuthProviders()) {
    const account = user.oauthAccounts.find((row) => row.provider === provider);
    methods.push({
      provider,
      label: OAUTH_PROVIDER_CONFIG[provider].label,
      connected: Boolean(account),
      linkedIdentifier:
        account?.email ??
        (account ? `${provider}:${account.providerAccountId}` : undefined),
      lastUsedAt: account?.lastUsedAt?.toISOString(),
      action: account ? "disconnect" : "connect",
      canDisconnect: account ? connectedCount > 1 : false,
    });
  }

  return methods;
}
