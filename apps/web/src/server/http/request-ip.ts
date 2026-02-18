import { env } from "@/server/config/env";

export function extractClientIp(req: Request): string {
  if (env.TRUST_PROXY_HEADERS) {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]!.trim();

    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
  }

  return "127.0.0.1";
}
