import { AuthCoreError } from "@auth-core";
import { NextResponse } from "next/server";

type AuthErrorBody = {
  ok: false;
  error: string;
};

export function authErrorResponse(
  error: unknown,
  fallbackMessage = "internal_error",
): NextResponse<AuthErrorBody> {
  if (error instanceof AuthCoreError) {
    switch (error.code) {
      case "invalid_credentials":
      case "unauthorized":
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
      case "email_in_use":
        return NextResponse.json({ ok: false, error: "email_in_use" }, { status: 409 });
      case "invalid_token":
        return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 400 });
      case "expired_token":
        return NextResponse.json({ ok: false, error: "expired_token" }, { status: 410 });
      case "rate_limited":
        return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
      default:
        return NextResponse.json({ ok: false, error: "auth_error" }, { status: 400 });
    }
  }

  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ok: false, error: fallbackMessage }, { status: 500 });
}
