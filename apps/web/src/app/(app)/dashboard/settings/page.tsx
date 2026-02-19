import "server-only";

import { prisma } from "@db";

import { SecurityActions } from "@/features/settings/ui/security-actions";
import { requireUser } from "@/server/auth/require-user";

export default async function SettingsPage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUnique({ where: { id: sessionUser.userId } });

  return (
    <div style={{ padding: 24, maxWidth: 980 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Settings</h1>

      <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
        <section style={card}>
          <h2 style={h2}>Profile</h2>
          <div style={{ marginTop: 10 }}>
            <div style={label}>Email</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{user?.email ?? "—"}</div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
              Email changes are not supported in V1 (keeps linking simple).
            </div>
          </div>
        </section>

        <section style={card}>
          <h2 style={h2}>Security</h2>
          <p style={{ marginTop: 8, color: "#666" }}>
            Reset your password or revoke your sessions.
          </p>

          <div style={{ marginTop: 12 }}>
            <SecurityActions userEmail={user?.email ?? ""} />
          </div>
        </section>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 16,
};

const h2: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
};

const label: React.CSSProperties = {
  fontSize: 12,
  color: "#666",
};
