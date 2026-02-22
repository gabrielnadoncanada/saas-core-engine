import { safeRedirectPath } from "@auth-core";

import { routes } from "@/shared/constants/routes";

export function getDashboardRedirectPath(redirect?: string | null) {
  return safeRedirectPath(redirect ?? null);
}

export function getOAuthStartUrl(provider: "google" | "github", redirectPath?: string | null) {
  const redirect = encodeURIComponent(getDashboardRedirectPath(redirectPath));
  return `/api/auth/oauth/${provider}/start?redirect=${redirect}`;
}
