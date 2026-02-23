import { isIP } from "node:net";

import { env } from "@/server/config/env";

function firstValidIpFromList(value: string | null): string | null {
  if (!value) return null;
  for (const part of value.split(",")) {
    const candidate = part.trim();
    if (candidate.length === 0) continue;
    if (isIP(candidate) !== 0) return candidate;
  }
  return null;
}

function validSingleIp(value: string | null): string | null {
  if (!value) return null;
  const candidate = value.trim();
  if (candidate.length === 0) return null;
  return isIP(candidate) !== 0 ? candidate : null;
}

export function extractClientIp(req: Request): string {
  if (env.TRUST_PROXY_HEADERS) {
    const fromCf = validSingleIp(req.headers.get("cf-connecting-ip"));
    if (fromCf) return fromCf;

    const fromForwarded = firstValidIpFromList(req.headers.get("x-forwarded-for"));
    if (fromForwarded) return fromForwarded;

    const fromRealIp = validSingleIp(req.headers.get("x-real-ip"));
    if (fromRealIp) return fromRealIp;
  }

  return "127.0.0.1";
}
