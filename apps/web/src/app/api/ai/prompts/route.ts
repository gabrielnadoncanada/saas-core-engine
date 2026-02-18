import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/require-user";
import { DEFAULT_PROMPTS } from "@/server/ai/prompts/default-prompts";
import { createAIPromptsService } from "@/server/adapters/core/ai-core.adapter";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key") as keyof typeof DEFAULT_PROMPTS | null;

  if (!key || !(key in DEFAULT_PROMPTS)) {
    return NextResponse.json({
      ok: true,
      keys: Object.keys(DEFAULT_PROMPTS),
    });
  }

  const prompts = createAIPromptsService();
  await prompts.ensurePrompt(user.organizationId, key, DEFAULT_PROMPTS[key]);
  const data = await prompts.listPromptVersions(user.organizationId, key);

  return NextResponse.json({ ok: true, key, ...data });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );

  const body = (await req.json()) as { key: string; content: string };
  const key = body.key as keyof typeof DEFAULT_PROMPTS;

  if (!key || !(key in DEFAULT_PROMPTS)) {
    return NextResponse.json(
      { ok: false, error: "Invalid key" },
      { status: 400 },
    );
  }
  if (!body.content || body.content.trim().length < 10) {
    return NextResponse.json(
      { ok: false, error: "Content too short" },
      { status: 400 },
    );
  }

  const result = await createAIPromptsService().createPromptVersion(
    user.organizationId,
    key,
    body.content,
    user.id,
  );

  return NextResponse.json({ ok: true, ...result });
}
