import { NextResponse } from "next/server";
import { InviteService, MembershipService } from "@org-core";
import { env } from "@/server/config/env";
import { requireUser } from "@/server/auth/require-user";
import { getDefaultOrgIdForUser } from "@/server/auth/require-org";
import { getEmailService } from "@/server/services/email.service";
import { absoluteUrl } from "@/server/services/url.service";

type Body = { email: string; role: "admin" | "member" };

export async function POST(req: Request) {
  const user = await requireUser();
  const body = (await req.json()) as Body;

  const orgId = await getDefaultOrgIdForUser();
  if (!orgId)
    return NextResponse.json({ ok: false, error: "No org" }, { status: 400 });

  const email = body?.email?.trim();
  const role = body?.role;

  if (!email || (role !== "admin" && role !== "member")) {
    return NextResponse.json(
      { ok: false, error: "Invalid input" },
      { status: 400 },
    );
  }

  // Only owner/admin can invite
  const membershipSvc = new MembershipService();
  await membershipSvc.requireOrgRole({
    userId: user.userId,
    organizationId: orgId,
    roles: ["owner", "admin"],
  });

  const invites = new InviteService();
  const issued = await invites.createInvite({
    organizationId: orgId,
    inviterUserId: user.userId,
    email,
    role,
    pepper: env.TOKEN_PEPPER,
    ttlMinutes: 60 * 24 * 3, // 3 days
  });

  const acceptUrl = absoluteUrl(
    `/api/org/invite/accept?token=${encodeURIComponent(issued.token)}`,
  );
  const mail = getEmailService();
  await mail.sendVerifyEmail(email, acceptUrl); // reuse verify template; later you add a dedicated invite template

  return NextResponse.json({ ok: true });
}
