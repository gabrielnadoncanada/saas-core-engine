import { NextResponse } from "next/server";

import { createSessionService } from "@/server/adapters/core/auth-core.adapter";
import { authErrorResponse } from "@/server/auth/auth-error-response";
import { requireUser } from "@/server/auth/require-user";

type Body = { sessionId: string };

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as Body;

    if (!body?.sessionId)
      return NextResponse.json(
        { ok: false, error: "invalid_input" },
        { status: 400 },
      );

    const sessions = createSessionService();
    const all = await sessions.listActiveSessions(user.userId);
    const owns = all.some((s) => s.id === body.sessionId);
    if (!owns)
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 },
      );

    await sessions.revokeSession(body.sessionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
