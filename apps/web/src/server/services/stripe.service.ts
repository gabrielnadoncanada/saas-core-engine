import "server-only";

import Stripe from "stripe";
import type { BillingProvider } from "@billing-core";
import { env } from "@/server/config/env";

export function stripe() {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-08-27.basil",
    typescript: true,
  });
}

export class StripeBillingProvider implements BillingProvider {
  async createCustomer(params: {
    organizationId: string;
    orgName?: string | null;
  }): Promise<{ customerId: string }> {
    const s = stripe();
    const customer = await s.customers.create({
      name: params.orgName ?? undefined,
      metadata: { organizationId: params.organizationId },
    });
    return { customerId: customer.id };
  }

  async createCheckoutSession(params: {
    customerId: string;
    organizationId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string | null }> {
    const s = stripe();
    const session = await s.checkout.sessions.create({
      mode: "subscription",
      customer: params.customerId,
      line_items: [{ price: params.priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { organizationId: params.organizationId },
      },
      metadata: { organizationId: params.organizationId },
    });
    return { url: session.url };
  }

  async createPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    const s = stripe();
    const portal = await s.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });
    return { url: portal.url };
  }
}
