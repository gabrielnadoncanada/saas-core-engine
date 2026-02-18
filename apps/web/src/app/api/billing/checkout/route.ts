import { NextResponse } from "next/server";
import { env } from "@/server/config/env";
import { requireOrgContext } from "@/server/auth/require-org";
import { createBillingSessionService } from "@/server/adapters/core/billing-core.adapter";
import { withApiTelemetry } from "@/server/telemetry/otel";

type Body = { plan: "pro" };

export async function POST(req: Request) {
  return withApiTelemetry(req, "/api/billing/checkout", async () => {
    const body = (await req.json()) as Body;

    if (body?.plan !== "pro") {
      return NextResponse.json(
        { ok: false, error: "Invalid plan" },
        { status: 400 },
      );
    }

    const orgCtx = await requireOrgContext();

    const billing = createBillingSessionService();
    const session = await billing.createCheckoutSession({
      organizationId: orgCtx.organizationId,
      priceId: env.STRIPE_PRICE_PRO_MONTHLY,
      successUrl: env.STRIPE_SUCCESS_URL,
      cancelUrl: env.STRIPE_CANCEL_URL,
    });

    return NextResponse.json({ ok: true, url: session.url });
  });
}
