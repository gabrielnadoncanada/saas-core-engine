import { NextResponse } from "next/server";
import { prisma } from "@db";
import { env } from "@/server/config/env";
import { requireUser } from "@/server/auth/require-user";
import { getDefaultOrgIdForUser } from "@/server/auth/require-org";
import {
  ensureStripeCustomerForOrg,
  stripe,
} from "@/server/services/stripe.service";

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

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  const customerId = await ensureStripeCustomerForOrg({
    organizationId,
    orgName: org?.name ?? null,
  });

  const s = stripe();

  const session = await s.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: env.STRIPE_PRICE_PRO_MONTHLY, quantity: 1 }],
    success_url: env.STRIPE_SUCCESS_URL,
    cancel_url: env.STRIPE_CANCEL_URL,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { organizationId },
    },
    metadata: { organizationId },
  });

  return NextResponse.json({ ok: true, url: session.url });
}
