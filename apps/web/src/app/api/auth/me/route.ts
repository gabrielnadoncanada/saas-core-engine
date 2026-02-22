import { NextResponse } from "next/server";

import { getSessionUser } from "@/server/auth/require-user";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: true, user: null });

  return NextResponse.json({
    ok: true,
    user,
  });
}
