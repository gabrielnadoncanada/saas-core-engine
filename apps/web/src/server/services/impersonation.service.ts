import "server-only";

import { randomBytes } from "node:crypto";

import { hashToken } from "@auth-core";
import { prisma } from "@db";
import {
  ImpersonationService,
  type ImpersonationSessionsRepo,
  type ImpersonationTokenCodec,
} from "@org-core";

import { env } from "@/server/config/env";
import { MembershipsRepo } from "@/server/db-repos/memberships.repo";

class PrismaImpersonationSessionsRepo implements ImpersonationSessionsRepo {
  create(params: {
    organizationId: string;
    actorUserId: string;
    targetUserId: string;
    tokenHash: string;
    actorIp?: string | null;
    actorUserAgent?: string | null;
    traceId?: string | null;
  }) {
    return prisma.impersonationSession.create({
      data: {
        organizationId: params.organizationId,
        actorUserId: params.actorUserId,
        targetUserId: params.targetUserId,
        tokenHash: params.tokenHash,
        actorIp: params.actorIp ?? null,
        actorUserAgent: params.actorUserAgent ?? null,
        traceId: params.traceId ?? null,
      },
      select: { id: true },
    });
  }

  findActiveByTokenHash(tokenHash: string) {
    return prisma.impersonationSession.findFirst({
      where: {
        tokenHash,
        endedAt: null,
      },
      select: {
        id: true,
        organizationId: true,
        actorUserId: true,
        targetUserId: true,
      },
    });
  }

  findActiveByTokenHashAndActor(params: {
    tokenHash: string;
    actorUserId: string;
  }) {
    return prisma.impersonationSession.findFirst({
      where: {
        tokenHash: params.tokenHash,
        endedAt: null,
        actorUserId: params.actorUserId,
      },
      select: { id: true },
    });
  }

  endById(params: { id: string; reason: string }) {
    return prisma.impersonationSession.update({
      where: { id: params.id },
      data: {
        endedAt: new Date(),
        endReason: params.reason,
      },
      select: {
        id: true,
        organizationId: true,
        actorUserId: true,
        targetUserId: true,
      },
    });
  }
}

const tokenCodec: ImpersonationTokenCodec = {
  randomToken: () => randomBytes(24).toString("hex"),
  hashToken: (token: string) => hashToken(token, env.TOKEN_PEPPER),
};

function createImpersonationService() {
  return new ImpersonationService(
    new MembershipsRepo(),
    new PrismaImpersonationSessionsRepo(),
    tokenCodec,
  );
}

export async function startImpersonation(params: {
  organizationId: string;
  actorUserId: string;
  targetUserId: string;
  ip?: string | null;
  userAgent?: string | null;
  traceId?: string | null;
}) {
  return createImpersonationService().start(params);
}

export async function resolveActiveImpersonation(token: string) {
  return createImpersonationService().resolveActiveImpersonation(token);
}

export async function stopImpersonation(params: {
  token: string;
  actorUserId: string;
  reason?: string;
}) {
  return createImpersonationService().stop(params);
}
