import { NextResponse } from "next/server";
import { getOrCreateRequestId, withRequestId } from "@/server/http/request-context";
import { withApiTelemetry } from "@/server/telemetry/otel";

export async function GET(req: Request) {
  return withApiTelemetry(req, "/api/health", async () => {
    const requestId = getOrCreateRequestId(req);
    return withRequestId(
      NextResponse.json({
        ok: true,
        service: "web",
        status: "alive",
        timestamp: new Date().toISOString(),
      }),
      requestId,
    );
  });
}
