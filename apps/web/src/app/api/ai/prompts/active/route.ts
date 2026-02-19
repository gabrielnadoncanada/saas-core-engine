import { NextResponse } from "next/server";

import { createAIPromptsService } from "@/server/adapters/core/ai-core.adapter";
import { DEFAULT_PROMPTS } from "@/server/ai/prompts/default-prompts";
import { getSessionUser } from "@/server/auth/require-user";
import { withRequiredOrgScope } from "@/server/auth/with-org-scope";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );

  try {
    await withRequiredOrgScope({
      organizationId: user.organizationId,
      action: "ai:prompts:manage",
      run: async () => undefined,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

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

  await createAIPromptsService().setActivePromptVersion(
    user.organizationId,
    key,
    body.version,
  );

  return NextResponse.json({ ok: true });
}
