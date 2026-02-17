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

export function isUniqueConstraintViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  if (code === "P2002") return true;
  const message = (error as { message?: string }).message;
  return typeof message === "string" && message.toLowerCase().includes("unique");
}
