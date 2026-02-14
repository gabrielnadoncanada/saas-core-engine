import { NextResponse } from "next/server";
import { MagicLoginFlow } from "@auth-core";
import { env } from "@/server/config/env";
import { getEmailService } from "@/server/services/email.service";
import { absoluteUrl } from "@/server/services/url.service";

type Body = { email: string };

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const email = body?.email?.trim();

  if (!email) return NextResponse.json({ ok: true }); // anti-enum

  const flow = new MagicLoginFlow();

  const issued = await flow.request({
    email,
    pepper: env.TOKEN_PEPPER,
    ttlMinutes: 15,
  });

  const url = absoluteUrl(
    `/api/auth/magic/confirm?token=${encodeURIComponent(issued.token)}`,
  );
  const mail = getEmailService();
  await mail.sendMagicLink(email, url);

  return NextResponse.json({ ok: true });
}
