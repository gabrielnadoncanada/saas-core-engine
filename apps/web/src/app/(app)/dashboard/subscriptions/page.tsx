import "server-only";

import { prisma } from "@db";

import { BillingActions } from "@/features/billing/ui/billing-actions";
import { getDefaultOrgIdForUser } from "@/server/auth/require-org";
import { requireUser } from "@/server/auth/require-user";

export default async function SubscriptionsPage() {
  await requireUser();
  const orgId = await getDefaultOrgIdForUser();

  if (!orgId) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Subscriptions</h1>
        <p>No organization found.</p>
      </div>
    );
  }

  const [subscription, events] = await Promise.all([
    prisma.subscription.findUnique({ where: { organizationId: orgId } }),
    prisma.billingWebhookEvent.findMany({
      where: { organizationId: orgId },
      orderBy: { receivedAt: "desc" },
      take: 20,
      select: {
        eventId: true,
        eventType: true,
        status: true,
        receivedAt: true,
      },
    }),
  ]);

  return (
    <div style={{ padding: 24, maxWidth: 980 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Subscriptions</h1>
      <p style={{ marginTop: 8, color: "#666" }}>
        Subscription state and recent billing webhook traces.
      </p>

      <div style={{ marginTop: 16, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, color: "#666" }}>Plan</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{subscription?.plan ?? "free"}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#666" }}>Status</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{subscription?.status ?? "inactive"}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#666" }}>Period end</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {subscription?.currentPeriodEnd
                ? subscription.currentPeriodEnd.toDateString()
                : "—"}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <BillingActions
            hasCustomer={Boolean(subscription?.providerCustomerId)}
            isPro={subscription?.plan === "pro"}
          />
        </div>
      </div>

      <div style={{ marginTop: 16, border: "1px solid #eee", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
              <th style={th}>Received</th>
              <th style={th}>Event</th>
              <th style={th}>Status</th>
              <th style={th}>Event ID</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.eventId} style={{ borderBottom: "1px solid #f2f2f2" }}>
                <td style={td}>{event.receivedAt.toLocaleString()}</td>
                <td style={td}>{event.eventType}</td>
                <td style={td}>{event.status}</td>
                <td style={td}>{event.eventId}</td>
              </tr>
            ))}
            {events.length === 0 ? (
              <tr>
                <td style={td} colSpan={4}>
                  No webhook events found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 12,
  color: "#666",
};

const td: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 14,
};
