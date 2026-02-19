import { NextResponse } from "next/server";

import { createVerifyEmailFlow } from "@/server/adapters/core/auth-core.adapter";
import { absoluteUrl } from "@/server/services/url.service";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      absoluteUrl("/dashboard?error=missing_verification_token"),
    );
  }

  const flow = createVerifyEmailFlow();
  const result = await flow.confirm({ token });

  if (!result.ok) {
    return NextResponse.redirect(
      absoluteUrl("/dashboard?error=expired_verification_link"),
    );
  }

  return NextResponse.redirect(absoluteUrl("/dashboard?verified=true"));
}
