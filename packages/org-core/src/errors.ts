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
