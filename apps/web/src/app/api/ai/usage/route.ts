import { NextResponse } from "next/server";
import { prisma } from "@db";
import { getSessionUser } from "@/shared/getSessionUser";
import { getMonthRange } from "@/server/ai/ai-quota";
import { getOrgPlan, getOrgMonthlyUsage } from "@/server/ai/ai-usage.service";
import { AI_QUOTAS } from "@/server/ai/ai-quota";

export async function GET() {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );

  const orgId = user.organizationId;
  const plan = await getOrgPlan(orgId);
  const quota = AI_QUOTAS[plan]?.monthlyTokens ?? AI_QUOTAS.free.monthlyTokens;

  const monthly = await getOrgMonthlyUsage(orgId);
  const { start, end } = getMonthRange();

  // Daily aggregation (tokens + cost)
  const rows = await prisma.aIUsage.findMany({
    where: { organizationId: orgId, createdAt: { gte: start, lt: end } },
    select: {
      createdAt: true,
      inputTokens: true,
      outputTokens: true,
      costUsd: true,
      userId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Per user aggregation
  const byUser = new Map<
    string,
    { input: number; output: number; cost: number }
  >();
  for (const r of rows) {
    const cur = byUser.get(r.userId) ?? { input: 0, output: 0, cost: 0 };
    cur.input += r.inputTokens;
    cur.output += r.outputTokens;
    cur.cost += r.costUsd;
    byUser.set(r.userId, cur);
  }

  // Resolve emails for top users
  const userIds = Array.from(byUser.keys());
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true },
  });
  const emailById = new Map(users.map((u) => [u.id, u.email] as const));

  // Daily buckets
  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const daily = new Map<
    string,
    { day: string; tokens: number; costUsd: number }
  >();

  for (const r of rows) {
    const k = dayKey(r.createdAt);
    const cur = daily.get(k) ?? { day: k, tokens: 0, costUsd: 0 };
    cur.tokens += r.inputTokens + r.outputTokens;
    cur.costUsd += r.costUsd;
    daily.set(k, cur);
  }

  return NextResponse.json({
    ok: true,
    plan,
    quota,
    monthly,
    daily: Array.from(daily.values()).sort((a, b) => (a.day < b.day ? -1 : 1)),
    users: Array.from(byUser.entries())
      .map(([userId, v]) => ({
        userId,
        email: emailById.get(userId) ?? userId.slice(0, 8) + "…",
        tokens: v.input + v.output,
        inputTokens: v.input,
        outputTokens: v.output,
        costUsd: v.cost,
      }))
      .sort((a, b) => b.tokens - a.tokens),
  });
}
