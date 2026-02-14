import { NextResponse } from "next/server";
import { prisma } from "@db";
import { requireUser } from "@/server/auth/require-user";
import { getDefaultOrgIdForUser } from "@/server/auth/require-org";
import { stripe } from "@/server/services/stripe.service";
import { env } from "@/server/config/env";

export async function POST() {
  await requireUser();

  const orgId = await getDefaultOrgIdForUser();
  if (!orgId)
    return NextResponse.json({ ok: false, error: "No org" }, { status: 400 });

  const sub = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
  });
  if (!sub?.stripeCustomerId) {
    return NextResponse.json(
      { ok: false, error: "No Stripe customer" },
      { status: 400 },
    );
  }

  const s = stripe();

  const portal = await s.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${env.APP_URL.replace(/\/$/, "")}/dashboard/billing`,
  });

  return NextResponse.json({ ok: true, url: portal.url });
}
