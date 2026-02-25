"use server";

import { createInviteService } from "@/server/adapters/core/org-core.adapter";
import { ActionResult, ok, fail } from "@/shared/types";
import { authErrorMessage } from "@/server/auth/auth-error-message";

type InviteEmailData = { email: string };

const INVITE_INVALID_MESSAGE = "Invitation is invalid or expired.";
const INVITE_ALREADY_USED_MESSAGE = "This invitation has already been used.";

export async function getInviteEmailByTokenAction(
  token: string,
): Promise<ActionResult<InviteEmailData>> {
  try {
    const inviteService = createInviteService();
    const lookup = await inviteService.getInviteForToken(token);

    if (lookup.status === "invalid") return fail(INVITE_INVALID_MESSAGE);
    if (lookup.status === "expired") return fail(INVITE_INVALID_MESSAGE);
    if (lookup.status === "accepted") return fail(INVITE_ALREADY_USED_MESSAGE);

    return ok({ email: lookup.invite.email });
  } catch (error) {
    return fail(authErrorMessage(error, INVITE_INVALID_MESSAGE));
  }
}
