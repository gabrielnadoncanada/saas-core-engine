import "server-only";

import { prisma } from "@db";
import Link from "next/link";
import { requireUser } from "@/server/auth/require-user";
import { getDefaultOrgIdForUser } from "@/server/auth/require-org";
import { routes } from "@/shared/constants/routes";
import { MetricsChart } from "@/features/dashboard/ui/metrics-chart";
import { ActivityFeed } from "@/features/dashboard/ui/activity-feed";
import { env } from "@/server/config/env";

export default async function DashboardHomePage() {
  const sessionUser = await requireUser();
  const orgId = await getDefaultOrgIdForUser();

  const user = await prisma.user.findUnique({ where: { id: sessionUser.userId } });
  const org = orgId ? await prisma.organization.findUnique({ where: { id: orgId } }) : null;
  const sub = orgId ? await prisma.subscription.findUnique({ where: { organizationId: orgId } }) : null;

  const teamSize = orgId
    ? await prisma.membership.count({ where: { organizationId: orgId } })
    : 0;


  const demoChart = [
    { label: "Mon", value: 12 },
    { label: "Tue", value: 18 },
    { label: "Wed", value: 14 },
    { label: "Thu", value: 22 },
    { label: "Fri", value: 28 },
    { label: "Sat", value: 21 },
    { label: "Sun", value: 30 },
  ];

  const demoActivity = [
    { title: "Teammate invited", detail: "teammate@saastemplate.dev joined Demo Workspace", time: "2h ago" },
    { title: "Subscription active", detail: "Plan set to Pro via Stripe webhook", time: "1d ago" },
    { title: "Password reset", detail: "Security action executed successfully", time: "3d ago" },
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={hero}>
        <div>
          <div style={{ fontSize: 12, color: "#666" }}>Welcome</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>
            {user?.email ?? "—"}
          </div>
          <div style={{ marginTop: 6, color: "#666" }}>
            Workspace: <span style={{ color: "#111", fontWeight: 600 }}>{org?.name ?? "—"}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={routes.app.team} style={btnPrimary}>Invite teammate</Link>
          <Link href={routes.app.billing} style={btnGhost}>
            {sub?.plan === "pro" ? "Manage billing" : "Upgrade to Pro"}
          </Link>
        </div>
      </section>

      <div style={grid}>
        <StatCard
          title="Plan"
          value={(sub?.plan ?? "free").toUpperCase()}
          hint={`Status: ${sub?.status ?? "inactive"}`}
        />
        <StatCard
          title="Team members"
          value={String(teamSize)}
          hint="Members in your workspace"
        />
        <StatCard title="Security" value="OK" hint="Sessions + reset ready" />
        <StatCard title="Integrations" value="Google" hint="OAuth enabled" />
      </div>

      {env.DEMO_MODE ? (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <MetricsChart title="Weekly usage" subtitle="Demo data (replace with real metrics)" data={demoChart} />
          <ActivityFeed items={demoActivity} />
        </div>
      ) : null}
      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800 }}>Quick links</div>
            <div style={{ color: "#666", marginTop: 6, fontSize: 13 }}>
              Common actions for a SaaS starter.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href={routes.app.sessions} style={btnGhost}>Sessions</Link>
            <Link href={routes.app.settings} style={btnGhost}>Settings</Link>
            <Link href={routes.app.billing} style={btnGhost}>Billing</Link>
          </div>
        </div>
      </section>
    </div>
  );
}


const hero: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 16,
  padding: 16,
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  alignItems: "center",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
};

const card: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 16,
  padding: 16,
  background: "#fff",
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 700,
};

const btnGhost: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "transparent",
  color: "#111",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 700,
};

function StatCard(props: { title: string; value: string; hint: string }) {
  return (
    <section style={card}>
      <div style={{ fontSize: 12, color: "#666" }}>{props.title}</div>
      <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800 }}>
        {props.value}
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
        {props.hint}
      </div>
    </section>
  );
}
