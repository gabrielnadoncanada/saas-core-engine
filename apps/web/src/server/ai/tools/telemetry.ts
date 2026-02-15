import "server-only";

export async function time<T>(fn: () => Promise<T>) {
  const start = Date.now();
  try {
    const value = await fn();
    return {
      value,
      durationMs: Date.now() - start,
      error: null as string | null,
    };
  } catch (e) {
    return {
      value: null as unknown as T,
      durationMs: Date.now() - start,
      error: (e as Error).message,
    };
  }
}

export async function withTimeout<T>(p: Promise<T>, ms = 2000) {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Tool timeout after ${ms}ms`)), ms),
    ),
  ]);
}

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "secret",
  "apiKey",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
]);

export function redact(obj: unknown): unknown {
  if (obj == null) return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  if (typeof obj !== "object") return obj;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k)) out[k] = "[REDACTED]";
    else out[k] = redact(v);
  }
  return out;
}

export function clampJsonSize(obj: unknown, maxChars = 20_000) {
  const s = JSON.stringify(obj);
  if (s.length > maxChars) throw new Error("Tool result too large");
  return obj;
}
