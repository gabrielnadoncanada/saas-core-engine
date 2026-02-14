import { OpenAIProvider } from "@ai-core";
import { estimateCost } from "@ai-core";
import { prisma } from "@db";
import { getRequestMeta } from "@/server/ai/ai-audit";
import { env } from "@/server/config/env";
import { getSessionUser } from "@/shared/getSessionUser";
import { enforceAiOrThrow } from "@/server/ai/ai-enforcement";

type Body = {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
};

function sseJson(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json()) as Body;
  if (!Array.isArray(body?.messages))
    return new Response("Invalid body", { status: 400 });

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
    const { messageCount, promptChars } = getRequestMeta(body.messages);
    policy = await enforceAiOrThrow(sessionUser.organizationId);
  } catch (e) {
    const status = (e as any).status ?? 429;
    const meta = (e as any).meta ?? null;

    const errorCode =
      status === 402 ? "quota" : status === 429 ? "rpm" : "blocked";

    await prisma.aIAuditLog.create({
      data: {
        organizationId: sessionUser.organizationId,
        userId: sessionUser.id,
        model: "blocked",
        plan: meta?.plan ?? "unknown",
        route: "/api/ai/chat",
        promptChars,
        messageCount,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        status: "blocked",
        errorCode,
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

  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      async start(controller) {
        let finalUsage: { inputTokens: number; outputTokens: number } | null =
          null;

        try {
          const stream = provider.streamEvents({
            messages: body.messages,
            model,
            userId: sessionUser.id,
            orgId: sessionUser.organizationId,
          });

          for await (const ev of stream) {
            if (ev.type === "delta") {
              controller.enqueue(
                encoder.encode(sseJson({ type: "delta", text: ev.text })),
              );
            } else if (ev.type === "usage") {
              finalUsage = {
                inputTokens: ev.inputTokens,
                outputTokens: ev.outputTokens,
              };
              controller.enqueue(
                encoder.encode(
                  sseJson({
                    type: "usage",
                    ...finalUsage,
                    model,
                    plan: policy.plan,
                  }),
                ),
              );
            }
          }

          if (finalUsage) {
            await prisma.aIAuditLog.create({
              data: {
                organizationId: sessionUser.organizationId,
                userId: sessionUser.id,
                model,
                plan: policy.plan,
                route: "/api/ai/chat",
                promptChars,
                messageCount,
                inputTokens: finalUsage.inputTokens,
                outputTokens: finalUsage.outputTokens,
                costUsd: estimateCost(
                  model,
                  finalUsage.inputTokens,
                  finalUsage.outputTokens,
                ),
                status: "ok",
              },
            });
          }

          controller.enqueue(encoder.encode(sseJson({ type: "done" })));
          controller.close();
        } catch {
          controller.enqueue(
            encoder.encode(
              sseJson({ type: "error", message: "AI request failed" }),
            ),
          );
          controller.close();
          await prisma.aIAuditLog.create({
            data: {
              organizationId: sessionUser.organizationId,
              userId: sessionUser.id,
              model,
              plan: policy.plan,
              route: "/api/ai/chat",
              promptChars,
              messageCount,
              inputTokens: 0,
              outputTokens: 0,
              costUsd: 0,
              status: "error",
              errorCode: "provider",
              errorMessage: "AI request failed",
            },
          });
        }
      },
    }),
    {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",

        // Debug/UX headers (nice for devs)
        "x-ai-plan": policy.plan,
        "x-ai-model": model,
        "x-ai-quota": String(policy.quota),
        "x-ai-used": String(policy.used),
        "x-ai-rpm": String(policy.rpm),
        "x-ai-rpm-count": String(policy.rpmCount),
        "x-ai-rpm-window": policy.rpmWindowStart,
      },
    },
  );
}
