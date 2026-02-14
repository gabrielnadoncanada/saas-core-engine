import { NextResponse } from "next/server";

export async function POST() {
  // V1: not implemented (single org default)
  return NextResponse.json(
    { ok: false, error: "Not implemented in V1" },
    { status: 501 },
  );
}
