import { NextResponse } from "next/server";
import { PasswordResetFlow } from "@auth-core";
import { env } from "@/server/config/env";
import { getEmailService } from "@/server/services/email.service";
import { absoluteUrl } from "@/server/services/url.service";

type Body = { email: string };

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const email = body?.email?.trim();

  // Always return ok to prevent enumeration
  if (!email) return NextResponse.json({ ok: true });

  const flow = new PasswordResetFlow();
  const res = await flow.request({
    email,
    pepper: env.TOKEN_PEPPER,
    ttlMinutes: 15,
  });

  // If user exists, token is returned; otherwise res has no token
  if ("token" in res && res.token) {
    const url = absoluteUrl(
      `/reset-password?token=${encodeURIComponent(res.token)}`,
    );
    const mail = getEmailService();
    await mail.sendResetPassword(email, url);
  }

  return NextResponse.json({ ok: true });
}
