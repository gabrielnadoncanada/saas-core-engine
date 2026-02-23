import { OrgCoreError } from "@org-core";
import { RbacForbiddenError } from "@rbac-core";
import { NextResponse } from "next/server";

type OrgErrorBody = {
  ok: false;
  error: string;
};

export function orgErrorResponse(
  error: unknown,
  fallbackMessage = "internal_error",
): NextResponse<OrgErrorBody> {
  if (error instanceof OrgCoreError) {
    switch (error.code) {
      case "unauthorized":
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
      case "forbidden":
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      case "invalid_invite":
        return NextResponse.json({ ok: false, error: "invalid_invite" }, { status: 400 });
      case "invite_expired":
        return NextResponse.json({ ok: false, error: "invite_expired" }, { status: 400 });
      case "invite_already_accepted":
        return NextResponse.json(
          { ok: false, error: "invite_already_accepted" },
          { status: 400 },
        );
      case "invite_email_mismatch":
        return NextResponse.json(
          { ok: false, error: "invite_email_mismatch" },
          { status: 400 },
        );
      default:
        return NextResponse.json({ ok: false, error: "org_error" }, { status: 400 });
    }
  }

  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (error instanceof Error && error.message === "NO_ORG") {
    return NextResponse.json({ ok: false, error: "no_org" }, { status: 400 });
  }
  if (
    error instanceof RbacForbiddenError ||
    (error instanceof Error && error.message === "FORBIDDEN")
  ) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({ ok: false, error: fallbackMessage }, { status: 500 });
}
