import { NextResponse, type NextRequest } from "next/server";

const REQUEST_ID_HEADER = "x-request-id";

function getOrCreateRequestId(req: NextRequest): string {
  const incoming = req.headers.get(REQUEST_ID_HEADER)?.trim();
  if (incoming && incoming.length > 0) return incoming;
  return crypto.randomUUID();
}

export function middleware(req: NextRequest) {
  const requestId = getOrCreateRequestId(req);
  const res = NextResponse.next();

  res.headers.set(REQUEST_ID_HEADER, requestId);
  res.headers.set("x-content-type-options", "nosniff");
  res.headers.set("x-frame-options", "DENY");
  res.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  res.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set(
    "content-security-policy",
    "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  );

  if (process.env["NODE_ENV"] === "production") {
    const maxAge = process.env["HSTS_MAX_AGE_SECONDS"] ?? "31536000";
    res.headers.set(
      "strict-transport-security",
      `max-age=${maxAge}; includeSubDomains; preload`,
    );
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
