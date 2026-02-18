export function clampPositiveTtlMinutes(
  value: number,
  maxMinutes: number,
): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("ttlMinutes must be a positive number");
  }

  return Math.min(Math.floor(value), maxMinutes);
}

export function clampTtlMinutes(
  value: number,
  minMinutes: number,
  maxMinutes: number,
): number {
  const normalized = Number.isFinite(value) ? Math.floor(value) : minMinutes;
  return Math.min(Math.max(normalized, minMinutes), maxMinutes);
}
