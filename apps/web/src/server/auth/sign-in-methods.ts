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

export function isOAuthProviderEnabled(provider: OAuthProvider): boolean {
  if (provider === "google") {
    return env.AUTH_SIGNIN_GOOGLE_ENABLED;
  }

  return (
    env.AUTH_SIGNIN_GITHUB_ENABLED &&
    Boolean(
      env.GITHUB_OAUTH_CLIENT_ID &&
        env.GITHUB_OAUTH_CLIENT_SECRET &&
        env.GITHUB_OAUTH_REDIRECT_URI,
    )
  );
}

export function enabledOAuthProviders(): OAuthProvider[] {
  return (["google", "github"] as const).filter((provider) =>
    isOAuthProviderEnabled(provider),
  );
}
