import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/require-user";
import { getDefaultOrgIdForUser } from "@/server/auth/require-org";
import { createBillingSessionService } from "@/server/adapters/core/billing-core.adapter";
import { env } from "@/server/config/env";

export async function POST() {
  await requireUser();

  const orgId = await getDefaultOrgIdForUser();
  if (!orgId)
    return NextResponse.json({ ok: false, error: "No org" }, { status: 400 });

  const billing = createBillingSessionService();
  const portal = await billing.createPortalSession({
    organizationId: orgId,
    returnUrl: `${env.APP_URL.replace(/\/$/, "")}/dashboard/billing`,
  });

  if (!portal) {
    return NextResponse.json(
      { ok: false, error: "No Stripe customer" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, url: portal.url });
}
