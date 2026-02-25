// src/server/auth/auth-error-message.ts

import { AuthCoreError } from "@auth-core";

export type AuthErrorKey =
  | "unauthorized"
  | "email_in_use"
  | "invalid_token"
  | "expired_token"
  | "rate_limited"
  | "auth_error"
  | "internal_error";

/**
 * Returns an auth error key suitable for UI translation / messaging.
 * Use this in Server Actions and other non-HTTP contexts.
 */
export function authErrorKey(
  error: unknown,
  fallback: AuthErrorKey = "internal_error",
): AuthErrorKey {
  if (error instanceof AuthCoreError) {
    switch (error.code) {
      case "invalid_credentials":
      case "unauthorized":
        return "unauthorized";
      case "email_in_use":
        return "email_in_use";
      case "invalid_token":
        return "invalid_token";
      case "expired_token":
        return "expired_token";
      case "rate_limited":
        return "rate_limited";
      default:
        return "auth_error";
    }
  }

  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return "unauthorized";
  }

  return fallback;
}

/**
 * Returns a human-friendly English message.
 * If you use i18n, prefer authErrorKey() and map keys -> translations in the client.
 */
export function authErrorMessage(
  error: unknown,
  fallbackMessage = "Something went wrong. Please try again.",
): string {
  const key = authErrorKey(error);

  switch (key) {
    case "unauthorized":
      return "Unauthorized. Please sign in again.";
    case "email_in_use":
      return "This email is already in use.";
    case "invalid_token":
      return "This link is invalid.";
    case "expired_token":
      return "This link has expired.";
    case "rate_limited":
      return "Too many requests. Please try again later.";
    case "auth_error":
      return "Authentication error. Please try again.";
    case "internal_error":
    default:
      return fallbackMessage;
  }
}
