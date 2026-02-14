import { NextResponse } from "next/server";
import { SessionService } from "@auth-core";
import { requireUser } from "@/server/auth/require-user";

export async function POST() {
  const user = await requireUser();
  const sessions = new SessionService();

  await sessions.revokeAllForUser(user.userId);
  return NextResponse.json({ ok: true });
}
