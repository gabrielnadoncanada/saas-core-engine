/** Mirrors @auth-core safeRedirectPath. Kept local to avoid pulling argon2/node-gyp into client bundle. */
function safeRedirectPath(input: string | null): string {
  if (!input) return "/dashboard";
  if (!input.startsWith("/")) return "/dashboard";
  if (input.startsWith("//")) return "/dashboard";
  if (input.includes("..")) return "/dashboard";
  if (input.includes("\\")) return "/dashboard";
  if (input.includes("http://") || input.includes("https://")) {
    return "/dashboard";
  }
  return input;
}

export function getDashboardRedirectPath(redirect?: string | null) {
  return safeRedirectPath(redirect ?? null);
}

export function getOAuthStartUrl(provider: "google" | "github", redirectPath?: string | null) {
  const redirect = encodeURIComponent(getDashboardRedirectPath(redirectPath));
  return `/api/auth/oauth/${provider}/start?redirect=${redirect}`;
}
