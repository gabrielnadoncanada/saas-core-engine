import "server-only";

import { toIsoOrNull } from "./convert";

import type { OrganizationSubscription, OrganizationSubscriptionWire } from "@contracts";

export function subscriptionToWire(s: OrganizationSubscription): OrganizationSubscriptionWire {
  return {
    organizationId: s.organizationId,
    plan: s.plan,
    status: s.status,
    providerCustomerId: s.providerCustomerId,
    providerSubscriptionId: s.providerSubscriptionId,
    currentPeriodEnd: toIsoOrNull(s.currentPeriodEnd),
    needsReconcile: s.needsReconcile,
    lastSyncedAt: toIsoOrNull(s.lastSyncedAt),
    lastProviderSnapshotAt: toIsoOrNull(s.lastProviderSnapshotAt),
  };
}
