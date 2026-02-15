import { NextResponse } from "next/server";
import { getEmailService } from "@/server/services/email.service";
import { absoluteUrl } from "@/server/services/url.service";
import { createMagicLoginFlow } from "@/server/adapters/core/auth-core.adapter";

type Body = { email: string };

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const email = body?.email?.trim();

  if (!email) return NextResponse.json({ ok: true });

  const flow = createMagicLoginFlow();

  const issued = await flow.request({
    email,
    ttlMinutes: 15,
  });

  const url = absoluteUrl(
    `/api/auth/magic/confirm?token=${encodeURIComponent(issued.token)}`,
  );
  const mail = getEmailService();
  await mail.sendMagicLink(email, url);

  return NextResponse.json({ ok: true });
}
