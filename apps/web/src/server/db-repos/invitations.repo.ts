import { prisma, type DbTx } from "@db";

import type { Invitation, MembershipRole } from "@prisma/client";

const db = (tx?: DbTx) => tx ?? prisma;

export class InvitationsRepo {
  async create(
    params: {
      organizationId: string;
      email: string;
      role: MembershipRole;
      tokenHash: string;
      expiresAt: Date;
    },
    tx?: DbTx,
  ): Promise<Invitation> {
    return db(tx).invitation.create({
      data: {
        organizationId: params.organizationId,
        email: params.email.toLowerCase(),
        role: params.role,
        tokenHash: params.tokenHash,
        expiresAt: params.expiresAt,
      },
    });
  }

  async findValidByTokenHash(
    tokenHash: string,
    tx?: DbTx,
  ): Promise<Invitation | null> {
    return db(tx).invitation.findFirst({
      where: { tokenHash, acceptedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  async findByTokenHash(tokenHash: string, tx?: DbTx): Promise<Invitation | null> {
    return db(tx).invitation.findUnique({
      where: { tokenHash },
    });
  }

  async findById(invitationId: string, tx?: DbTx): Promise<Invitation | null> {
    return db(tx).invitation.findUnique({
      where: { id: invitationId },
    });
  }

  async markAcceptedIfPending(invitationId: string, tx?: DbTx): Promise<boolean> {
    const result = await db(tx).invitation.updateMany({
      where: { id: invitationId, acceptedAt: null },
      data: { acceptedAt: new Date() },
    });
    return result.count > 0;
  }

  async listPending(organizationId: string, tx?: DbTx): Promise<Invitation[]> {
    return db(tx).invitation.findMany({
      where: {
        organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findPendingByEmail(
    params: { organizationId: string; email: string },
    tx?: DbTx,
  ): Promise<Invitation | null> {
    return db(tx).invitation.findFirst({
      where: {
        organizationId: params.organizationId,
        email: params.email.toLowerCase(),
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async revokeIfPending(invitationId: string, tx?: DbTx): Promise<boolean> {
    const result = await db(tx).invitation.updateMany({
      where: {
        id: invitationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { expiresAt: new Date() },
    });
    return result.count > 0;
  }
}
