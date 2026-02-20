import { routes } from "@/shared/constants/routes";

export function getDashboardRedirectPath() {
  return routes.app.dashboard;
}

export function getOAuthStartUrl(provider: "google" | "github") {
  const redirect = encodeURIComponent(getDashboardRedirectPath());
  return `/api/auth/oauth/${provider}/start?redirect=${redirect}`;
}
