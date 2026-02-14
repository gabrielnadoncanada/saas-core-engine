import type { Invitation, MembershipRole } from "@prisma/client";
import { getDb, type DbTx } from "../tx";

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
    return getDb(tx).invitation.create({
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
    return getDb(tx).invitation.findFirst({
      where: { tokenHash, acceptedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  async markAccepted(invitationId: string, tx?: DbTx): Promise<void> {
    await getDb(tx).invitation.update({
      where: { id: invitationId },
      data: { acceptedAt: new Date() },
    });
  }

  async listPending(organizationId: string, tx?: DbTx): Promise<Invitation[]> {
    return getDb(tx).invitation.findMany({
      where: {
        organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
