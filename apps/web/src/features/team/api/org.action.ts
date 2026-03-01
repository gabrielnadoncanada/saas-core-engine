"use server";

import { orgCreateBodySchema, orgSwitchBodySchema } from "@contracts";

import type { MembershipRole } from "@contracts";

import { createOrgService } from "@/server/adapters/core/org-core.adapter";
import { orgErrorMessage } from "@/server/auth/org-error-message";
import { requireUser } from "@/server/auth/require-user";
import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import { type ActionResult, fail, ok } from "@/shared/types/action-result";

export async function createOrgAction(input: {
  name: string;
}): Promise<ActionResult<{ organizationId: string }>> {
  const parsed = orgCreateBodySchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input.");

  try {
    const user = await requireUser();
    const orgs = createOrgService();
    const result = await orgs.createOrg({
      ownerUserId: user.userId,
      name: parsed.data.name,
    });
    return ok({ organizationId: result.organizationId });
  } catch (error) {
    return fail(orgErrorMessage(error));
  }
}

export async function switchOrgAction(input: {
  organizationId: string;
}): Promise<ActionResult<{ organizationId: string }>> {
  const parsed = orgSwitchBodySchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input.");

  try {
    const switched = await withRequiredOrgScope({
      organizationId: parsed.data.organizationId,
      action: "org:switch",
      run: async (ctx) => {
        const orgs = createOrgService();
        return orgs.switchActiveOrganization({
          userId: ctx.userId,
          organizationId: ctx.organizationId,
        });
      },
    });
    return ok({ organizationId: switched.organizationId });
  } catch (error) {
    return fail(orgErrorMessage(error));
  }
}

type OrgOption = {
  organizationId: string;
  name: string;
  role: MembershipRole;
};

export async function listOrgsAction(): Promise<
  ActionResult<{ activeOrganizationId: string; organizations: OrgOption[] }>
> {
  try {
    const user = await requireUser();
    const orgs = createOrgService();
    const organizations = await orgs.listUserOrganizations(user.userId);
    return ok({
      activeOrganizationId: user.organizationId,
      organizations,
    });
  } catch (error) {
    return fail(orgErrorMessage(error));
  }
}
