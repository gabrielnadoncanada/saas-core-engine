import { NextResponse } from "next/server";
import { getSessionUser } from "@/shared/getSessionUser";
import { DEFAULT_PROMPTS } from "@/server/ai/prompts/default-prompts";
import { setActivePromptVersion } from "@/server/ai/prompts/ai-prompts.service";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );

  const body = (await req.json()) as { key: string; version: number };
  const key = body.key as keyof typeof DEFAULT_PROMPTS;

  if (!key || !(key in DEFAULT_PROMPTS)) {
    return NextResponse.json(
      { ok: false, error: "Invalid key" },
      { status: 400 },
    );
  }
  if (!Number.isInteger(body.version) || body.version < 1) {
    return NextResponse.json(
      { ok: false, error: "Invalid version" },
      { status: 400 },
    );
  }

  await setActivePromptVersion(user.organizationId, key, body.version);

  return NextResponse.json({ ok: true });
}
