import { NextResponse } from "next/server";
import { SessionService } from "@auth-core";
import { requireUser } from "@/server/auth/require-user";

export async function GET() {
  const user = await requireUser();
  const sessions = new SessionService();

  const list = await sessions.listActiveSessions(user.userId);

  return NextResponse.json({
    ok: true,
    sessions: list.map((s) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      revokedAt: s.revokedAt ? s.revokedAt.toISOString() : null,
      userAgent: s.userAgent,
      ip: s.ip,
    })),
  });
}
