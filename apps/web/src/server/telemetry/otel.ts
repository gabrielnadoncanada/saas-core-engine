import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

type TraceContext = { traceId: string; spanId: string };

const store = new AsyncLocalStorage<TraceContext>();

function toTraceHex(input: string): string {
  return input.replace(/[^a-fA-F0-9]/g, "").toLowerCase();
}

function safeTraceId(value: string | null): string {
  const cleaned = value ? toTraceHex(value) : "";
  if (cleaned.length >= 32) return cleaned.slice(0, 32);
  return randomUUID().replace(/-/g, "");
}

function safeSpanId(value: string | null): string {
  const cleaned = value ? toTraceHex(value) : "";
  if (cleaned.length >= 16) return cleaned.slice(0, 16);
  return randomUUID().replace(/-/g, "").slice(0, 16);
}

export function getActiveTraceContext(): TraceContext | null {
  return store.getStore() ?? null;
}

export async function withApiTelemetry<T extends Response>(
  req: Request,
  _route: string,
  handler: () => Promise<T>,
  _attributes: Record<string, unknown> = {},
): Promise<T> {
  const traceId = safeTraceId(req.headers.get("x-trace-id"));
  const spanId = safeSpanId(req.headers.get("x-span-id"));
  return store.run({ traceId, spanId }, handler);
}
