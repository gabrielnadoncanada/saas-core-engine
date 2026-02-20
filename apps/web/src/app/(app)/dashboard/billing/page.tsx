import "server-only";

import { prisma } from "@db";

import { BillingActions } from "@/features/billing/ui";
import { getDefaultOrgIdForUser } from "@/server/auth/require-org";

export default async function BillingPage() {
  const orgId = await getDefaultOrgIdForUser();

  if (!orgId) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Billing</h1>
        <p>No organization found.</p>
      </div>
    );
  }

  const sub = await prisma.subscription.findUnique({ where: { organizationId: orgId } });

  return (
    <div style={{ padding: 24, maxWidth: 980 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Billing</h1>

      <div style={{ marginTop: 16, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, color: "#666" }}>Plan</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{sub?.plan ?? "free"}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#666" }}>Status</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{sub?.status ?? "inactive"}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#666" }}>Period end</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {sub?.currentPeriodEnd ? sub.currentPeriodEnd.toDateString() : "—"}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <BillingActions hasCustomer={Boolean(sub?.providerCustomerId)} isPro={sub?.plan === "pro"} />
        </div>
      </div>
    </div>
  );
}
