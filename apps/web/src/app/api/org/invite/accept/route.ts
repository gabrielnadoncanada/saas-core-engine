import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/require-user";
import { createInviteService } from "@/server/adapters/core/org-core.adapter";

export async function GET(req: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token)
    return NextResponse.redirect(
      new URL("/dashboard/team?invite=invalid", req.url),
    );

  const invites = createInviteService();

  try {
    await invites.acceptInvite({
      token,
      acceptUserId: user.userId,
    });
    return NextResponse.redirect(
      new URL("/dashboard/team?invite=accepted", req.url),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "INVITE_FAILED";
    const code =
      msg === "INVITE_EMAIL_MISMATCH"
        ? "email_mismatch"
        : msg === "INVALID_INVITE"
          ? "invalid"
          : "failed";

    return NextResponse.redirect(
      new URL(`/dashboard/team?invite=${code}`, req.url),
    );
  }
}