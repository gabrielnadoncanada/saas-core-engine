import "server-only";

/**
 * Canonical conversion helpers.
 * These are the ONLY places where Date ↔ string conversions should occur.
 * All mappers should use these instead of calling .toISOString() or new Date() directly.
 */

/** Convert a Date to ISO 8601 string for wire/API responses. */
export function toIso(date: Date): string {
  return date.toISOString();
}

/** Convert a nullable Date to ISO 8601 string or null. */
export function toIsoOrNull(date: Date | null | undefined): string | null {
  return date?.toISOString() ?? null;
}

/** Parse an ISO 8601 string back to a Date (for incoming wire → domain). */
export function fromIso(iso: string): Date {
  return new Date(iso);
}
