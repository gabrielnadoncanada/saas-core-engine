import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/require-user";
import { createSessionService } from "@/server/adapters/core/auth-core.adapter";

export async function POST() {
  const user = await requireUser();
  const sessions = createSessionService();

  await sessions.revokeAllForUser(user.userId);
  return NextResponse.json({ ok: true });
}