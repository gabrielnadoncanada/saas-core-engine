import { NextResponse } from "next/server";
import { authErrorKey, type AuthErrorKey } from "./auth-error-message";

type AuthErrorBody = { ok: false; error: AuthErrorKey };

function statusForKey(key: AuthErrorKey): number {
  switch (key) {
    case "unauthorized":
      return 401;
    case "email_in_use":
      return 409;
    case "invalid_token":
      return 400;
    case "expired_token":
      return 410;
    case "rate_limited":
      return 429;
    case "auth_error":
      return 400;
    case "internal_error":
    default:
      return 500;
  }
}

export function authErrorResponse(
  error: unknown,
  fallback: AuthErrorKey = "internal_error",
): NextResponse<AuthErrorBody> {
  const key = authErrorKey(error, fallback);
  return NextResponse.json({ ok: false, error: key }, { status: statusForKey(key) });
}
