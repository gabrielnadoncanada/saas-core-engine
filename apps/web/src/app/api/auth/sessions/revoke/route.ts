import { NextResponse } from "next/server";
import { SessionService } from "@auth-core";
import { requireUser } from "@/server/auth/require-user";

type Body = { sessionId: string };

export async function POST(req: Request) {
  const user = await requireUser();
  const body = (await req.json()) as Body;

  if (!body?.sessionId)
    return NextResponse.json(
      { ok: false, error: "Invalid input" },
      { status: 400 },
    );

  // V1: revoke by id (safe enough). V2: verify session belongs to user in DB.
  const sessions = new SessionService();
  const all = await sessions.listActiveSessions(user.userId);
  const owns = all.some((s) => s.id === body.sessionId);
  if (!owns)
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 },
    );

  await sessions.revokeSession(body.sessionId);
  return NextResponse.json({ ok: true });
}
