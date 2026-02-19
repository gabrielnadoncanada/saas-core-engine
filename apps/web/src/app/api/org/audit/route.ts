import { NextResponse } from "next/server";

import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import { queryOrgAudit } from "@/server/services/org-audit.service";
import { withApiTelemetry } from "@/server/telemetry/otel";

function csvEscape(input: unknown): string {
  const value = String(input ?? "");
  if (!/[",\n]/.test(value)) return value;
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

function parseDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

export async function GET(req: Request) {
  return withApiTelemetry(req, "/api/org/audit", async () => {
    const url = new URL(req.url);
    const format = url.searchParams.get("format");
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "25");
    const sort = url.searchParams.get("sort");
    const action = url.searchParams.get("action") ?? undefined;
    const actorUserId = url.searchParams.get("actorUserId") ?? undefined;
    const outcome = url.searchParams.get("outcome") as "success" | "forbidden" | "error" | null;
    const targetType = url.searchParams.get("targetType") ?? undefined;
    const targetId = url.searchParams.get("targetId") ?? undefined;
    const from = parseDate(url.searchParams.get("from"));
    const to = parseDate(url.searchParams.get("to"));

    const requiredAction = format ? "org:audit:export" : "org:audit:read";

    return withRequiredOrgScope({
      action: requiredAction,
      run: async (orgCtx) => {
        const result = await queryOrgAudit({
          organizationId: orgCtx.organizationId,
          page: Number.isFinite(page) ? page : 1,
          pageSize: Number.isFinite(pageSize) ? pageSize : 25,
          sortDir: sort === "asc" ? "asc" : "desc",
          filters: {
            action,
            actorUserId,
            outcome: outcome ?? undefined,
            targetType,
            targetId,
            from,
            to,
          },
        });

        if (format === "json") {
          return NextResponse.json({
            ok: true,
            exportedAt: new Date().toISOString(),
            total: result.total,
            rows: result.rows,
          });
        }

        if (format === "csv") {
          const header = [
            "id",
            "createdAt",
            "actorUserId",
            "action",
            "targetType",
            "targetId",
            "outcome",
            "ip",
            "userAgent",
            "traceId",
          ];
          const lines = result.rows.map((row) =>
            [
              row.id,
              row.createdAt.toISOString(),
              row.actorUserId,
              row.action,
              row.targetType,
              row.targetId,
              row.outcome,
              row.ip,
              row.userAgent,
              row.traceId,
            ]
              .map(csvEscape)
              .join(","),
          );
          const csv = [header.join(","), ...lines].join("\n");

          return new NextResponse(csv, {
            status: 200,
            headers: {
              "content-type": "text/csv; charset=utf-8",
              "content-disposition": `attachment; filename="org-audit-${orgCtx.organizationId}.csv"`,
            },
          });
        }

        return NextResponse.json({
          ok: true,
          ...result,
        });
      },
    });
  });
}
