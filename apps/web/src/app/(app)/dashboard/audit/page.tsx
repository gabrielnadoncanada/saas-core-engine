import "server-only";

import { OrgAuditPanel } from "@/features/audit/ui";

export default function AuditPage() {
  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Audit Logs</h1>
      <p style={{ marginTop: 8, color: "#666" }}>
        Query, filter and export organization security events.
      </p>

      <div style={{ marginTop: 24 }}>
        <OrgAuditPanel />
      </div>
    </div>
  );
}
