export type AuthErrorCode =
  | "invalid_credentials"
  | "email_in_use"
  | "invalid_token"
  | "expired_token"
  | "unauthorized"
  | "rate_limited";

export type EmailTokenType =
  | "magic_login"
  | "verify_email"
  | "password_reset";

export type OAuthProvider = "google" | "github";

export interface SessionSummary {
  id: string;
  userId: string;
  createdAt: Date;
  lastSeenAt: Date | null;
  expiresAt: Date;
  revokedAt: Date | null;
  ip: string | null;
  userAgent: string | null;
}

export interface SessionSummaryWire {
  id: string;
  userId: string;
  createdAt: string;
  lastSeenAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  ip: string | null;
  userAgent: string | null;
}
