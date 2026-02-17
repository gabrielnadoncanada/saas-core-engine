export type AuthRateLimitRoute =
  | "login"
  | "signup"
  | "magic_request"
  | "password_forgot"
  | "oauth_start"
  | "verify_email_request";

export function buildAuthRateLimitKey(params: {
  ip: string;
  route: AuthRateLimitRoute;
}): string {
  return `${params.ip}:${params.route}`;
}

