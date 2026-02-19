import { NextResponse } from "next/server";

import { createSessionService } from "@/server/adapters/core/auth-core.adapter";
import { authErrorResponse } from "@/server/auth/auth-error-response";
import { requireUser } from "@/server/auth/require-user";

export async function POST() {
  try {
    const user = await requireUser();
    const sessions = createSessionService();

    await sessions.revokeAllForUser(user.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
