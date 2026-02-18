import type { MembershipRole } from "@contracts";
import { orgErr } from "./errors";
import type { MembershipsRepo, TxRunner } from "./org.ports";

export class MembershipService<TTx = unknown> {
  constructor(
    private readonly memberships: MembershipsRepo<TTx>,
    private readonly txRunner: TxRunner<TTx>,
  ) {}

  async requireOrgRole(params: {
    userId: string;
    organizationId: string;
    roles: MembershipRole[];
  }) {
    const membership = await this.memberships.findUserMembership({
      userId: params.userId,
      organizationId: params.organizationId,
    });

    if (!membership) throw orgErr("forbidden", "User is not a member of this organization");
    if (!params.roles.includes(membership.role)) {
      throw orgErr("forbidden", "User role does not satisfy this action");
    }

    return membership;
  }

  async listOrgMembers(organizationId: string) {
    return this.memberships.listOrgMembers(organizationId);
  }

  async changeMemberRole(params: {
    actorUserId: string;
    organizationId: string;
    membershipId: string;
    role: Extract<MembershipRole, "admin" | "member">;
  }) {
    return this.txRunner.withTx(async (tx) => {
      const actor = await this.memberships.findUserMembership(
        { userId: params.actorUserId, organizationId: params.organizationId },
        tx,
      );
      if (!actor || actor.role === "member") {
        throw orgErr("forbidden", "Insufficient permissions to change role");
      }

      const target = await this.memberships.findById(params.membershipId, tx);
      if (!target || target.organizationId !== params.organizationId) {
        throw orgErr("forbidden", "Membership not found in organization");
      }

      if (actor.role === "admin" && target.role !== "member") {
        throw orgErr("forbidden", "Admin can only change members");
      }

      if (target.role === "owner") {
        const ownerCount = await this.memberships.countByRole(
          { organizationId: params.organizationId, role: "owner" },
          tx,
        );
        if (ownerCount <= 1) {
          throw orgErr("forbidden", "Cannot demote the last owner");
        }
      }

      await this.memberships.updateRole(target.id, params.role, tx);
    });
  }

  async removeMember(params: {
    actorUserId: string;
    organizationId: string;
    membershipId: string;
  }) {
    return this.txRunner.withTx(async (tx) => {
      const actor = await this.memberships.findUserMembership(
        { userId: params.actorUserId, organizationId: params.organizationId },
        tx,
      );
      if (!actor || actor.role === "member") {
        throw orgErr("forbidden", "Insufficient permissions to remove member");
      }

      const target = await this.memberships.findById(params.membershipId, tx);
      if (!target || target.organizationId !== params.organizationId) {
        throw orgErr("forbidden", "Membership not found in organization");
      }

      if (actor.role === "admin" && target.role !== "member") {
        throw orgErr("forbidden", "Admin can only remove members");
      }

      if (target.role === "owner") {
        const ownerCount = await this.memberships.countByRole(
          { organizationId: params.organizationId, role: "owner" },
          tx,
        );
        if (ownerCount <= 1) {
          throw orgErr("forbidden", "Cannot remove the last owner");
        }
      }

      await this.memberships.remove(target.id, tx);
    });
  }

  async transferOwnership(params: {
    currentOwnerUserId: string;
    organizationId: string;
    nextOwnerMembershipId: string;
  }) {
    return this.txRunner.withTx(async (tx) => {
      const currentOwner = await this.memberships.findUserMembership(
        { userId: params.currentOwnerUserId, organizationId: params.organizationId },
        tx,
      );
      if (!currentOwner || currentOwner.role !== "owner") {
        throw orgErr("forbidden", "Only owners can transfer ownership");
      }

      const nextOwner = await this.memberships.findById(params.nextOwnerMembershipId, tx);
      if (!nextOwner || nextOwner.organizationId !== params.organizationId) {
        throw orgErr("forbidden", "Target membership not found in organization");
      }

      if (nextOwner.role !== "owner") {
        await this.memberships.updateRole(nextOwner.id, "owner", tx);
      }

      if (currentOwner.id !== nextOwner.id) {
        await this.memberships.updateRole(currentOwner.id, "admin", tx);
      }
    });
  }
}
