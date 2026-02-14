import "server-only";

import { requireUser } from "@/server/auth/require-user";
import { SessionsPanel } from "@/features/sessions/ui/sessions-panel";

export default async function SessionsPage() {
  await requireUser();

  return (
    <div style={{ padding: 24, maxWidth: 980 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Sessions</h1>
      <p style={{ marginTop: 8, color: "#666" }}>
        Manage active sessions. Revoke access if you suspect unauthorized activity.
      </p>

      <div style={{ marginTop: 24 }}>
        <SessionsPanel />
      </div>
    </div>
  );
}
