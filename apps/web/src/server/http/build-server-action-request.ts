import "server-only";

import { headers } from "next/headers";

export async function buildActionRequest(pathname: string): Promise<Request> {
  const incoming = await headers();
  const forwardedProto = incoming.get("x-forwarded-proto");
  const forwardedHost = incoming.get("x-forwarded-host");
  const host = forwardedHost ?? incoming.get("host") ?? "localhost:3000";
  const proto = forwardedProto ?? "http";
  const url = `${proto}://${host}${pathname}`;

  return new Request(url, { headers: new Headers(incoming) });
}
