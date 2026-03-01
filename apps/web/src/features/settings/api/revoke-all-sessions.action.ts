"use server";

import { clearSessionCookie } from "@/server/adapters/cookies/session-cookie.adapter";
import { createSessionService } from "@/server/adapters/core/auth-core.adapter";
import { writeAuditLog } from "@/server/audit/audit-log";
import { requireUser } from "@/server/auth/require-user";
import { buildActionRequest } from "@/server/http/build-server-action-request";
import { fail, ok, type ActionResult } from "@/shared/types/action-result";

export async function revokeAllSessionsAction(): Promise<ActionResult> {
  const req = await buildActionRequest("/settings/security/revoke-sessions");
  try {
    const sessionUser = await requireUser();
    const sessions = createSessionService();
    await sessions.revokeAllForUser(sessionUser.userId);
    await clearSessionCookie();

    await writeAuditLog({
      request: req,
      actorUserId: sessionUser.userId,
      organizationId: sessionUser.organizationId,
      action: "auth.sessions.revoke_all",
      targetType: "user",
      targetId: sessionUser.userId,
      result: "success",
    });

    return ok();
  } catch (error) {
    await writeAuditLog({
      request: req,
      action: "auth.sessions.revoke_all",
      result: "failure",
      metadata: {
        error: error instanceof Error ? error.message : "unknown_error",
      },
    });
    return fail("Failed to revoke sessions.");
  }
}

