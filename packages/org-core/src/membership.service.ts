import { MembershipsRepo } from "@db";

export class MembershipService {
  constructor(private readonly memberships = new MembershipsRepo()) {}

  async requireOrgRole(params: {
    userId: string;
    organizationId: string;
    roles: Array<"owner" | "admin" | "member">;
  }) {
    const membership = await this.memberships.findUserMembership({
      userId: params.userId,
      organizationId: params.organizationId,
    });

    if (!membership) throw new Error("FORBIDDEN");
    if (!params.roles.includes(membership.role)) throw new Error("FORBIDDEN");

    return membership;
  }

  async listOrgMembers(organizationId: string) {
    return this.memberships.listOrgMembers(organizationId);
  }
}
