import type { OrgErrorCode } from "@contracts";

export class OrgCoreError extends Error {
  constructor(
    public readonly code: OrgErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "OrgCoreError";
  }
}

export function orgErr(
  code: OrgErrorCode,
  message: string,
  details?: unknown,
): OrgCoreError {
  return new OrgCoreError(code, message, details);
}

export function isUniqueConstraintViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  if (code === "P2002") return true;
  const message = (error as { message?: string }).message;
  return typeof message === "string" && message.toLowerCase().includes("unique");
}
