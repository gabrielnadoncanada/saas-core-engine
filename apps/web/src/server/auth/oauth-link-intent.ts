import type { OAuthProvider } from "@contracts";

const LINK_INTENT = "link";

export function isOAuthLinkIntent(
  redirectPath: string,
  provider: OAuthProvider,
): boolean {
  const url = new URL(redirectPath, "http://local");
  return (
    url.searchParams.get("oauth_intent") === LINK_INTENT &&
    url.searchParams.get("oauth_provider") === provider
  );
}

export function oauthLinkRedirectPath(provider: OAuthProvider): string {
  return `/dashboard/settings?oauth_intent=${LINK_INTENT}&oauth_provider=${provider}`;
}
