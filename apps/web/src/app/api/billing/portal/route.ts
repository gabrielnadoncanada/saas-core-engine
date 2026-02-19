import { NextResponse } from "next/server";

import { createBillingSessionService } from "@/server/adapters/core/billing-core.adapter";
import { requireOrgContext } from "@/server/auth/require-org";
import { env } from "@/server/config/env";
import { withApiTelemetry } from "@/server/telemetry/otel";

export async function POST(req: Request) {
  return withApiTelemetry(req, "/api/billing/portal", async () => {
    const orgCtx = await requireOrgContext();

    const billing = createBillingSessionService();
    const portal = await billing.createPortalSession({
      organizationId: orgCtx.organizationId,
      returnUrl: `${env.APP_URL.replace(/\/$/, "")}/dashboard/billing`,
    });

    if (!portal) {
      return NextResponse.json(
        { ok: false, error: "No billing customer" },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, url: portal.url });
  });
}
