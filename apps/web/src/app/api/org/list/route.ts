import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/require-user";
import { createOrgService } from "@/server/adapters/core/org-core.adapter";

export async function GET() {
  const user = await requireUser();
  const orgs = createOrgService();
  const organizations = await orgs.listUserOrganizations(user.userId);

  return NextResponse.json({
    ok: true,
    activeOrganizationId: user.organizationId,
    organizations,
  });
}
