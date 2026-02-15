import type { SubscriptionPlan } from "@contracts";

export function planFromPriceId(
  priceId: string | null | undefined,
  proMonthly: string,
): SubscriptionPlan {
  if (!priceId) return "free";
  if (priceId === proMonthly) return "pro";
  return "pro";
}