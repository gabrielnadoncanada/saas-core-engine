import { env } from "@/server/config/env";
import { getActiveTraceContext } from "@/server/telemetry/otel";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_RANK[level] >= LOG_LEVEL_RANK[env.LOG_LEVEL];
}

const REDACTED = "[REDACTED]";
const SENSITIVE_KEYS = [
  "token",
  "tokenhash",
  "authorization",
  "cookie",
  "set-cookie",
  "password",
  "secret",
  "apikey",
  "api_key",
  "accepturl",
];

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEYS.some((candidate) => normalized.includes(candidate));
}

function redactString(value: string): string {
  let redacted = value;
  redacted = redacted.replace(/([?&](?:token|code|state|signature|sig|secret|key)=)[^&]*/gi, `$1${REDACTED}`);
  redacted = redacted.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, `Bearer ${REDACTED}`);
  return redacted;
}

function sanitize(value: unknown): unknown {
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map((item) => sanitize(item));
  if (!value || typeof value !== "object") return value;

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      output[key] = REDACTED;
      continue;
    }
    output[key] = sanitize(entry);
  }
  return output;
}

function writeLog(level: LogLevel, event: string, data?: Record<string, unknown>) {
  if (!shouldLog(level)) return;
  const trace = getActiveTraceContext();

  const payload = sanitize({
    ts: new Date().toISOString(),
    level,
    event,
    traceId: trace?.traceId ?? null,
    spanId: trace?.spanId ?? null,
    ...data,
  });

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export function logDebug(event: string, data?: Record<string, unknown>) {
  writeLog("debug", event, data);
}

export function logInfo(event: string, data?: Record<string, unknown>) {
  writeLog("info", event, data);
}

export function logWarn(event: string, data?: Record<string, unknown>) {
  writeLog("warn", event, data);
}

export function logError(event: string, data?: Record<string, unknown>) {
  writeLog("error", event, data);
}
