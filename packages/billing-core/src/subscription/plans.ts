import type Stripe from "stripe";
import type { SubscriptionPlan } from "@prisma/client";

export function planFromPriceId(
  priceId: string | null | undefined,
  proMonthly: string,
): SubscriptionPlan {
  if (!priceId) return "free";
  if (priceId === proMonthly) return "pro";
  return "pro"; // V1: only one paid plan (treat unknown as pro)
}

export function getSubscriptionMainPriceId(
  sub: Stripe.Subscription,
): string | null {
  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  return priceId;
}
