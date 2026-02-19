import { NextResponse } from "next/server";

import { createOrgService } from "@/server/adapters/core/org-core.adapter";
import { requireUser } from "@/server/auth/require-user";
import { withApiTelemetry } from "@/server/telemetry/otel";

export async function GET(req: Request) {
  return withApiTelemetry(req, "/api/org/list", async () => {
    const user = await requireUser();
    const orgs = createOrgService();
    const organizations = await orgs.listUserOrganizations(user.userId);

    return NextResponse.json({
      ok: true,
      activeOrganizationId: user.organizationId,
      organizations,
    });
  });
}
