import { NextResponse } from "next/server";
import { getEmailService } from "@/server/services/email.service";
import { absoluteUrl } from "@/server/services/url.service";
import { createPasswordResetFlow } from "@/server/adapters/core/auth-core.adapter";
import { enforceAuthRateLimit } from "@/server/auth/auth-rate-limit";
import { authErrorResponse } from "@/server/auth/auth-error-response";
import { withApiTelemetry } from "@/server/telemetry/otel";

type Body = { email: string };

export async function POST(req: Request) {
  return withApiTelemetry(req, "/api/auth/password/forgot", async () => {
    try {
      await enforceAuthRateLimit(req, "password_forgot");

    const body = (await req.json()) as Body;
    const email = body?.email?.trim();

    if (!email) return NextResponse.json({ ok: true });

    const flow = createPasswordResetFlow();
    const res = await flow.request({
      email,
      ttlMinutes: 15,
    });

    if ("token" in res && typeof res.token === "string" && res.token.length > 0) {
      const url = absoluteUrl(
        `/reset-password?token=${encodeURIComponent(res.token)}`,
      );
      const mail = getEmailService();
      await mail.sendResetPassword(email, url);
    }

      return NextResponse.json({ ok: true });
    } catch (error) {
      return authErrorResponse(error);
    }
  });
}
