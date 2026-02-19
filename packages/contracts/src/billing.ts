export type BillingErrorCode =
  | "subscription_not_found"
  | "invalid_subscription"
  | "billing_provider_error";

export type SubscriptionPlan = "free" | "pro";

export type SubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";

export type BillingProviderSubscriptionStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

export interface BillingProviderSubscriptionSnapshot {
  id: string;
  status: BillingProviderSubscriptionStatus;
  currentPeriodEndUnix: number | null;
  priceId: string | null;
}

export interface OrganizationSubscription {
  organizationId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
}
