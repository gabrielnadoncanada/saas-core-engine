import "server-only";

import { env } from "@/server/config/env";

export function absoluteUrl(path: string): string {
  const base = env.APP_URL.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
