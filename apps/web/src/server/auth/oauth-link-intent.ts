import type { OAuthProvider } from "@contracts";
import { routes } from "@/shared/constants/routes";

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
  return `${routes.app.settingsAuthentication}?oauth_intent=${LINK_INTENT}&oauth_provider=${provider}`;
}
