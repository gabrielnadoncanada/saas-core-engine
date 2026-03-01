"use server";

import { createBillingSessionService } from "@/server/adapters/core/billing-core.adapter";
import { requireOrgContext } from "@/server/auth/require-org";
import { env } from "@/server/config/env";
import { type ActionResult, fail, ok } from "@/shared/types/action-result";

export async function createCheckoutAction(): Promise<
  ActionResult<{ url: string }>
> {
  try {
    const orgCtx = await requireOrgContext();
    const billing = createBillingSessionService();
    const session = await billing.createCheckoutSession({
      organizationId: orgCtx.organizationId,
      priceId: env.STRIPE_PRICE_PRO_MONTHLY,
      successUrl: env.STRIPE_SUCCESS_URL,
      cancelUrl: env.STRIPE_CANCEL_URL,
    });
    if (!session.url) return fail("Checkout session has no URL.");
    return ok({ url: session.url });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Checkout failed.",
    );
  }
}

export async function createPortalAction(): Promise<
  ActionResult<{ url: string }>
> {
  try {
    const orgCtx = await requireOrgContext();
    const billing = createBillingSessionService();
    const portal = await billing.createPortalSession({
      organizationId: orgCtx.organizationId,
      returnUrl: `${env.APP_URL.replace(/\/$/, "")}/dashboard/billing`,
    });

    if (!portal) return fail("No billing customer.");

    return ok({ url: portal.url });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Portal failed.",
    );
  }
}
