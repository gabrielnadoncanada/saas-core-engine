"use server";

import type { SessionSummaryWire } from "@contracts";

import { createSessionService } from "@/server/adapters/core/auth-core.adapter";
import { authErrorMessage } from "@/server/auth/auth-error-message";
import { requireUser } from "@/server/auth/require-user";
import { sessionToWire } from "@/server/mappers/auth.mapper";
import { type ActionResult, fail, ok } from "@/shared/types/action-result";

export async function listSessionsAction(): Promise<
  ActionResult<SessionSummaryWire[]>
> {
  try {
    const user = await requireUser();
    const sessions = createSessionService();
    const list = await sessions.listActiveSessions(user.userId);
    return ok(list.map(sessionToWire));
  } catch (error) {
    return fail(authErrorMessage(error));
  }
}

export async function revokeSessionAction(input: {
  sessionId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const sessions = createSessionService();
    const all = await sessions.listActiveSessions(user.userId);
    const owns = all.some((s) => s.id === input.sessionId);
    if (!owns) return fail("Forbidden.");

    await sessions.revokeSession(input.sessionId);
    return ok();
  } catch (error) {
    return fail(authErrorMessage(error));
  }
}

export async function revokeAllSessionsAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const sessions = createSessionService();
    await sessions.revokeAllForUser(user.userId);
    return ok();
  } catch (error) {
    return fail(authErrorMessage(error));
  }
}
