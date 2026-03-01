import "server-only";

import { prisma } from "@db";

import { requireOrgContext } from "@/server/auth/require-org";
import { requireUser } from "@/server/auth/require-user";

type AuditPageProps = {
  searchParams?: Promise<{ action?: string | string[]; result?: string | string[] }>;
};

function readSingle(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  await requireUser();
  const ctx = await requireOrgContext();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const action = readSingle(resolvedSearchParams?.action);
  const result = readSingle(resolvedSearchParams?.result);

  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(action && action.length > 0 ? { action } : {}),
      ...(result && (result === "success" || result === "failure") ? { result } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      createdAt: true,
      action: true,
      result: true,
      actorUserId: true,
      targetType: true,
      targetId: true,
      ip: true,
      traceId: true,
    },
  });

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Audit Logs</h1>
      <p style={{ marginTop: 8, color: "#666" }}>
        Organization-scoped security and mutation events.
      </p>

      <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a href="/dashboard/audit" style={linkBtn}>
          All
        </a>
        <a href="/dashboard/audit?result=success" style={linkBtn}>
          Success
        </a>
        <a href="/dashboard/audit?result=failure" style={linkBtn}>
          Failure
        </a>
        <a href="/dashboard/audit?action=account.delete" style={linkBtn}>
          Account Deletes
        </a>
        <a href="/dashboard/audit?action=organization.delete" style={linkBtn}>
          Org Deletes
        </a>
      </div>

      <div style={{ marginTop: 16, border: "1px solid #eee", borderRadius: 12, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
              <th style={th}>At</th>
              <th style={th}>Action</th>
              <th style={th}>Result</th>
              <th style={th}>Actor</th>
              <th style={th}>Target</th>
              <th style={th}>IP</th>
              <th style={th}>Trace</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                <td style={td}>{log.createdAt.toLocaleString()}</td>
                <td style={td}>{log.action}</td>
                <td style={td}>{log.result}</td>
                <td style={td}>{log.actorUserId ?? "-"}</td>
                <td style={td}>
                  {log.targetType ?? "-"}
                  {log.targetId ? `:${log.targetId}` : ""}
                </td>
                <td style={td}>{log.ip ?? "-"}</td>
                <td style={td}>{log.traceId ?? "-"}</td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
                <td style={td} colSpan={7}>
                  No audit logs found.
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
  fontSize: 13,
  whiteSpace: "nowrap",
};

const linkBtn: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid #ddd",
  borderRadius: 8,
  fontSize: 12,
  textDecoration: "none",
  color: "#111",
};

