import type { Membership, MembershipRole } from "@prisma/client";
import { getDb, type DbTx } from "../tx";

export class MembershipsRepo {
  async create(
    params: { userId: string; organizationId: string; role: MembershipRole },
    tx?: DbTx,
  ): Promise<Membership> {
    return getDb(tx).membership.create({ data: params });
  }

  async findUserMembership(
    params: { userId: string; organizationId: string },
    tx?: DbTx,
  ): Promise<Membership | null> {
    return getDb(tx).membership.findUnique({
      where: {
        userId_organizationId: {
          userId: params.userId,
          organizationId: params.organizationId,
        },
      },
    });
  }

  async listOrgMembers(organizationId: string, tx?: DbTx) {
    return getDb(tx).membership.findMany({
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
    await getDb(tx).membership.update({
      where: { id: membershipId },
      data: { role },
    });
  }

  async remove(membershipId: string, tx?: DbTx): Promise<void> {
    await getDb(tx).membership.delete({ where: { id: membershipId } });
  }
}
