import type { Membership, MembershipRole } from "@prisma/client";
import { prisma, type DbTx } from "@db";

const db = (tx?: DbTx) => tx ?? prisma;

export class MembershipsRepo {
  async create(
    params: { userId: string; organizationId: string; role: MembershipRole },
    tx?: DbTx,
  ): Promise<Membership> {
    return db(tx).membership.create({ data: params });
  }

  async findUserMembership(
    params: { userId: string; organizationId: string },
    tx?: DbTx,
  ): Promise<Membership | null> {
    return db(tx).membership.findUnique({
      where: {
        userId_organizationId: {
          userId: params.userId,
          organizationId: params.organizationId,
        },
      },
    });
  }

  async listOrgMembers(organizationId: string, tx?: DbTx) {
    return db(tx).membership.findMany({
      where: { organizationId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async updateRole(
    membershipId: string,
    role: MembershipRole,
    tx?: DbTx,
  ): Promise<void> {
    await db(tx).membership.update({
      where: { id: membershipId },
      data: { role },
    });
  }

  async remove(membershipId: string, tx?: DbTx): Promise<void> {
    await db(tx).membership.delete({ where: { id: membershipId } });
  }
}
