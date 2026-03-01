"use server";

import { prisma } from "@db";

import { createBillingSessionService } from "@/server/adapters/core/billing-core.adapter";
import { requireOrgContext } from "@/server/auth/require-org";
import { reconcileOrganizationSubscription } from "@/server/billing/reconcile-billing-subscription";
import { env } from "@/server/config/env";
import { incrementMetric } from "@/server/metrics/metrics";
import { type ActionResult, fail, ok } from "@/shared/types/action-result";

export async function createCheckoutAction(): Promise<
  ActionResult<{ url: string }>
> {
  if (!env.BILLING_ENABLED) return fail("Billing is disabled.");
  if (!env.STRIPE_PRICE_PRO_MONTHLY || !env.STRIPE_SUCCESS_URL || !env.STRIPE_CANCEL_URL) {
    return fail("Billing is not configured.");
  }
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
  if (!env.BILLING_ENABLED) return fail("Billing is disabled.");
  try {
    const orgCtx = await requireOrgContext();
    const billing = createBillingSessionService();
    await prisma.subscription.updateMany({
      where: { organizationId: orgCtx.organizationId },
      data: { needsReconcile: true },
    });
    const portal = await billing.createPortalSession({
      organizationId: orgCtx.organizationId,
      returnUrl: `${env.APP_URL.replace(/\/$/, "")}/dashboard/billing?from_portal=1`,
    });

    if (!portal) return fail("No billing customer.");

    return ok({ url: portal.url });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Portal failed.",
    );
  }
}

export async function reconcileBillingAction(): Promise<ActionResult> {
  if (!env.BILLING_ENABLED) return fail("Billing is disabled.");
  try {
    const orgCtx = await requireOrgContext();
    if (orgCtx.role !== "owner" && orgCtx.role !== "admin") {
      return fail("Forbidden.");
    }
    await reconcileOrganizationSubscription(orgCtx.organizationId);
    incrementMetric("billing_reconcile_manual_total");
    return ok();
  } catch (error) {
    incrementMetric("billing_reconcile_failure_total");
    return fail(error instanceof Error ? error.message : "Reconcile failed.");
  }
}
