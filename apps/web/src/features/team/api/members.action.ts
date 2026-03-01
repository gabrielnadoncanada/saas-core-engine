"use server";

import {
  orgMemberRoleChangeBodySchema,
  orgMembershipIdBodySchema,
} from "@contracts";

import { createMembershipService } from "@/server/adapters/core/org-core.adapter";
import { orgErrorMessage } from "@/server/auth/org-error-message";
import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import { type ActionResult, fail, ok } from "@/shared/types/action-result";

export async function removeMemberAction(input: {
  membershipId: string;
}): Promise<ActionResult> {
  const parsed = orgMembershipIdBodySchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input.");

  try {
    await withRequiredOrgScope({
      action: "org:member:remove",
      run: async (ctx) => {
        const memberships = createMembershipService();
        await memberships.removeMember({
          actorUserId: ctx.userId,
          organizationId: ctx.organizationId,
          membershipId: parsed.data.membershipId,
        });
      },
    });
    return ok();
  } catch (error) {
    return fail(orgErrorMessage(error));
  }
}

export async function changeMemberRoleAction(input: {
  membershipId: string;
  role: string;
}): Promise<ActionResult> {
  const parsed = orgMemberRoleChangeBodySchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input.");

  try {
    await withRequiredOrgScope({
      action: "org:member:role:change",
      targetRole: parsed.data.role,
      run: async (ctx) => {
        const memberships = createMembershipService();
        await memberships.changeMemberRole({
          actorUserId: ctx.userId,
          organizationId: ctx.organizationId,
          membershipId: parsed.data.membershipId,
          role: parsed.data.role,
        });
      },
    });
    return ok();
  } catch (error) {
    return fail(orgErrorMessage(error));
  }
}

export async function transferOwnershipAction(input: {
  membershipId: string;
}): Promise<ActionResult> {
  const parsed = orgMembershipIdBodySchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input.");

  try {
    await withRequiredOrgScope({
      action: "org:member:transfer_ownership",
      run: async (ctx) => {
        const memberships = createMembershipService();
        await memberships.transferOwnership({
          currentOwnerUserId: ctx.userId,
          organizationId: ctx.organizationId,
          nextOwnerMembershipId: parsed.data.membershipId,
        });
      },
    });
    return ok();
  } catch (error) {
    return fail(orgErrorMessage(error));
  }
}
