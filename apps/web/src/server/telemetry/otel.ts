export function getActiveTraceContext():
  | { traceId: string; spanId: string }
  | null {
  return null;
}

export async function withApiTelemetry<T extends Response>(
  _req: Request,
  _route: string,
  handler: () => Promise<T>,
  _attributes: Record<string, unknown> = {},
): Promise<T> {
  return handler();
}
