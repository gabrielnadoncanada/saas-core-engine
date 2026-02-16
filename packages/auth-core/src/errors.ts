import type { AuthErrorCode } from "@contracts";

export class AuthCoreError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AuthCoreError";
  }
}

export function authErr(
  code: AuthErrorCode,
  message: string,
  details?: unknown,
): AuthCoreError {
  return new AuthCoreError(code, message, details);
}
