import { randomUUID } from "node:crypto";

export const REQUEST_ID_HEADER = "x-request-id";

export function getOrCreateRequestId(req: Request): string {
  const incoming = req.headers.get(REQUEST_ID_HEADER)?.trim();
  return incoming && incoming.length > 0 ? incoming : randomUUID();
}

export function withRequestId<T extends Response>(res: T, requestId: string): T {
  res.headers.set(REQUEST_ID_HEADER, requestId);
  return res;
}
