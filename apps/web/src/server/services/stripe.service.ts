import "server-only";

import Stripe from "stripe";
import { prisma } from "@db";
import { env } from "@/server/config/env";

export function stripe() {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-08-27.basil",
    typescript: true,
  });
}

export async function ensureStripeCustomerForOrg(params: {
  organizationId: string;
  orgName?: string | null;
}) {
  const existing = await prisma.subscription.findUnique({
    where: { organizationId: params.organizationId },
  });

  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  const s = stripe();
  const customer = await s.customers.create({
    name: params.orgName ?? undefined,
    metadata: { organizationId: params.organizationId },
  });

  await prisma.subscription.upsert({
    where: { organizationId: params.organizationId },
    create: {
      organizationId: params.organizationId,
      plan: "free",
      status: "inactive",
      stripeCustomerId: customer.id,
    },
    update: {
      stripeCustomerId: customer.id,
    },
  });

  return customer.id;
}
