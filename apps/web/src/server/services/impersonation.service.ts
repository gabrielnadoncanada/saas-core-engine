import "server-only";

import { randomBytes } from "node:crypto";

import { hashToken } from "@auth-core";
import { prisma } from "@db";

import { env } from "@/server/config/env";

function createOpaqueToken(): string {
  return randomBytes(24).toString("hex");
}

function hashOpaqueToken(token: string): string {
  return hashToken(token, env.TOKEN_PEPPER);
}

export async function startImpersonation(params: {
  organizationId: string;
  actorUserId: string;
  targetUserId: string;
  ip?: string | null;
  userAgent?: string | null;
  traceId?: string | null;
}) {
  const token = createOpaqueToken();
  const tokenHash = hashOpaqueToken(token);

  const session = await prisma.impersonationSession.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      targetUserId: params.targetUserId,
      tokenHash,
      actorIp: params.ip ?? null,
      actorUserAgent: params.userAgent ?? null,
      traceId: params.traceId ?? null,
    },
  });

  return { token, session };
}

export async function resolveActiveImpersonation(token: string) {
  const tokenHash = hashOpaqueToken(token);
  return prisma.impersonationSession.findFirst({
    where: {
      tokenHash,
      endedAt: null,
    },
  });
}

export async function stopImpersonation(params: {
  token: string;
  actorUserId: string;
  reason?: string;
}) {
  const tokenHash = hashOpaqueToken(params.token);

  const existing = await prisma.impersonationSession.findFirst({
    where: {
      tokenHash,
      endedAt: null,
      actorUserId: params.actorUserId,
    },
  });

  if (!existing) return null;

  return prisma.impersonationSession.update({
    where: { id: existing.id },
    data: {
      endedAt: new Date(),
      endReason: params.reason ?? "manual",
    },
  });
}
