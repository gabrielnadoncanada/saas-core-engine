import { NextResponse } from "next/server";
import { getEmailService } from "@/server/services/email.service";
import { absoluteUrl } from "@/server/services/url.service";
import { createMagicLoginFlow } from "@/server/adapters/core/auth-core.adapter";
import { enforceAuthRateLimit } from "@/server/auth/auth-rate-limit";

type Body = { email: string };

export async function POST(req: Request) {
  try {
    await enforceAuthRateLimit(req, "magic_request");
  } catch (e) {
    if ((e as any).status === 429)
      return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
    throw e;
  }

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
