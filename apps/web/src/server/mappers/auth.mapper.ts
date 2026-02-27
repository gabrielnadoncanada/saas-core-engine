import "server-only";

import { toIso, toIsoOrNull } from "./convert";

import type { SessionSummary, SessionSummaryWire } from "@contracts";

export function sessionToWire(s: SessionSummary): SessionSummaryWire {
  return {
    id: s.id,
    userId: s.userId,
    createdAt: toIso(s.createdAt),
    lastSeenAt: toIsoOrNull(s.lastSeenAt),
    expiresAt: toIso(s.expiresAt),
    revokedAt: toIsoOrNull(s.revokedAt),
    ip: s.ip,
    userAgent: s.userAgent,
  };
}
