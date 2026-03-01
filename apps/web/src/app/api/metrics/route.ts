import { NextResponse } from "next/server";

import { getMetricsSnapshot } from "@/server/metrics/metrics";
import { withApiTelemetry } from "@/server/telemetry/otel";

export async function GET(req: Request) {
  return withApiTelemetry(req, "/api/metrics", async () => {
    const counters = getMetricsSnapshot();
    return NextResponse.json({
      ok: true,
      service: "web",
      counters,
      timestamp: new Date().toISOString(),
    });
  });
}

