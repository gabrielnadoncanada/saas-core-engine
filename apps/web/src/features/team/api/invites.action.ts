"use server";

import { orgInviteBodySchema, orgInviteRevokeBodySchema } from "@contracts";

import { createInviteService } from "@/server/adapters/core/org-core.adapter";
import { orgErrorMessage } from "@/server/auth/org-error-message";
import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import { logError, logInfo, logWarn } from "@/server/logging/logger";
import { getEmailService } from "@/server/services/email.service";
import { absoluteUrl } from "@/server/services/url.service";
import { type ActionResult, fail, ok } from "@/shared/types/action-result";

export async function inviteMemberAction(input: {
  email: string;
  role: string;
}): Promise<ActionResult> {
  const parsed = orgInviteBodySchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input.");

  try {
    await withRequiredOrgScope({
      action: "org:invite:create",
      run: async (ctx) => {
        const { email, role } = parsed.data;

        const invites = createInviteService();
        const issued = await invites.createInvite({
          organizationId: ctx.organizationId,
          inviterUserId: ctx.userId,
          email,
          role,
          ttlMinutes: 60 * 24 * 3,
        });

        const acceptUrl = absoluteUrl(
          `/api/org/invite/accept?token=${encodeURIComponent(issued.token)}`,
        );

        try {
          const mail = getEmailService();
          await mail.sendOrgInvite(email, acceptUrl);
        } catch (emailError) {
          logWarn("org.invite.email_delivery_failed", {
            organizationId: ctx.organizationId,
            actorUserId: ctx.userId,
            email: email.toLowerCase(),
            error:
              emailError instanceof Error
                ? { name: emailError.name, message: emailError.message }
                : { message: "unknown_error" },
          });
          throw emailError;
        }

        logInfo("org.invite.created", {
          organizationId: ctx.organizationId,
          actorUserId: ctx.userId,
          email: email.toLowerCase(),
          role,
        });
      },
    });
    return ok();
  } catch (error) {
    logError("org.invite.failed", {
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : { message: "unknown_error" },
    });
    return fail(orgErrorMessage(error));
  }
}

export async function revokeInviteAction(input: { invitationId: string }): Promise<ActionResult> {
  const parsed = orgInviteRevokeBodySchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input.");

  try {
    await withRequiredOrgScope({
      action: "org:invite:create",
      run: async (ctx) => {
        const invites = createInviteService();
        await invites.revokeInvite({
          actorUserId: ctx.userId,
          organizationId: ctx.organizationId,
          invitationId: parsed.data.invitationId,
        });
      },
    });
    return ok();
  } catch (error) {
    return fail(orgErrorMessage(error));
  }
}
