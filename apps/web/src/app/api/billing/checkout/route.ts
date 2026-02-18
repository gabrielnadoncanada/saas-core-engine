import { NextResponse } from "next/server";
import { env } from "@/server/config/env";
import { requireUser } from "@/server/auth/require-user";
import { getDefaultOrgIdForUser } from "@/server/auth/require-org";
import { createBillingSessionService } from "@/server/adapters/core/billing-core.adapter";

type Body = { plan: "pro" };

export async function POST(req: Request) {
  await requireUser();
  const body = (await req.json()) as Body;

  if (body?.plan !== "pro") {
    return NextResponse.json(
      { ok: false, error: "Invalid plan" },
      { status: 400 },
    );
  }

  const organizationId = await getDefaultOrgIdForUser();
  if (!organizationId)
    return NextResponse.json({ ok: false, error: "No org" }, { status: 400 });

  const billing = createBillingSessionService();
  const session = await billing.createCheckoutSession({
    organizationId,
    priceId: env.STRIPE_PRICE_PRO_MONTHLY,
    successUrl: env.STRIPE_SUCCESS_URL,
    cancelUrl: env.STRIPE_CANCEL_URL,
  });

  return NextResponse.json({ ok: true, url: session.url });
}
