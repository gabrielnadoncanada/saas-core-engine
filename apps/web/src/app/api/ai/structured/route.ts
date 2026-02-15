import { OpenAIProvider, estimateCost } from "@ai-core";
import { prisma } from "@db";
import { z } from "zod";

import { getSessionUser } from "@/shared/getSessionUser";
import { env } from "@/server/config/env";
import { enforceAiOrThrow } from "@/server/ai/ai-enforcement";

import { DEFAULT_PROMPTS } from "@/server/ai/prompts/default-prompts";
import { getActivePromptContent } from "@/server/ai/prompts/ai-prompts.service";
import { getRequestMeta } from "@/server/ai/ai-audit";

const BodySchema = z.object({
  text: z.string().min(10),
  kind: z.enum(["invoice_items", "contact"]),
});

const InvoiceSchema = z.object({
  currency: z.string().default("USD"),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().int().min(1).default(1),
      unitPrice: z.number().min(0),
    }),
  ),
});

const ContactSchema = z.object({
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return new Response("Invalid body", { status: 400 });

  // enforcement
  let policy: {
    plan: string;
    model: string;
    quota: number;
    used: number;
    rpm: number;
    rpmCount: number;
    rpmWindowStart: string;
  };
  try {
    policy = await enforceAiOrThrow(user.organizationId);
  } catch (e) {
    const status = (e as any).status ?? 429;
    const meta = (e as any).meta ?? null;

    await prisma.aIAuditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        model: "blocked",
        plan: meta?.plan ?? "unknown",
        route: "/api/ai/structured",
        promptChars: parsed.data.text.length,
        messageCount: 1,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        status: "blocked",
        errorCode: status === 402 ? "quota" : "rpm",
        errorMessage: (e as Error).message,
      },
    });

    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message, meta }),
      {
        status,
        headers: { "content-type": "application/json" },
      },
    );
  }

  const provider = new OpenAIProvider(env.OPENAI_API_KEY);
  const model = policy.model;

  const systemPrompt = await getActivePromptContent(
    user.organizationId,
    "chat.system",
    DEFAULT_PROMPTS["chat.system"],
  );

  const schema =
    parsed.data.kind === "invoice_items" ? InvoiceSchema : ContactSchema;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    {
      role: "user" as const,
      content:
        parsed.data.kind === "invoice_items"
          ? `Extract invoice line items from this text:\n\n${parsed.data.text}`
          : `Extract contact details from this text:\n\n${parsed.data.text}`,
    },
  ];

  const { messageCount, promptChars } = getRequestMeta(messages);

  try {
    const out = await provider.generateStructured({
      messages,
      model,
      temperature: 0,
      schema,
      userId: user.id,
      orgId: user.organizationId,
    });

    const cost = estimateCost(
      model,
      out.usage.inputTokens,
      out.usage.outputTokens,
    );

    await prisma.aIUsage.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        model,
        inputTokens: out.usage.inputTokens,
        outputTokens: out.usage.outputTokens,
        costUsd: cost,
      },
    });

    await prisma.aIAuditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        model,
        plan: policy.plan,
        route: "/api/ai/structured",
        promptChars,
        messageCount,
        inputTokens: out.usage.inputTokens,
        outputTokens: out.usage.outputTokens,
        costUsd: cost,
        status: "ok",
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        model,
        plan: policy.plan,
        data: out.data,
        usage: out.usage,
        costUsd: cost,
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-ai-plan": policy.plan,
          "x-ai-model": model,
        },
      },
    );
  } catch (e) {
    await prisma.aIAuditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        model,
        plan: policy.plan,
        route: "/api/ai/structured",
        promptChars,
        messageCount,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        status: "error",
        errorCode: "provider",
        errorMessage: "Structured generation failed",
      },
    });

    return new Response(
      JSON.stringify({ ok: false, error: "Structured generation failed" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
}
