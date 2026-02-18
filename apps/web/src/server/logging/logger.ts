import { env } from "@/server/config/env";

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

function writeLog(level: LogLevel, event: string, data?: Record<string, unknown>) {
  if (!shouldLog(level)) return;

  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...data,
  };

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
