import { NextResponse } from "next/server";
import { OrgService } from "@org-core";
import { requireUser } from "@/server/auth/require-user";

type Body = { name: string };

export async function POST(req: Request) {
  const user = await requireUser();
  const body = (await req.json()) as Body;

  if (!body?.name)
    return NextResponse.json(
      { ok: false, error: "Invalid input" },
      { status: 400 },
    );

  const orgs = new OrgService();
  const res = await orgs.createOrg({
    ownerUserId: user.userId,
    name: body.name,
  });

  return NextResponse.json({ ok: true, organizationId: res.organizationId });
}
