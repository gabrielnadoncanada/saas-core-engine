import { AI_POLICY, buildAIUsageReport, getMonthRange, normalizePlan } from "@ai-core";
import { prisma } from "@db";
import { NextResponse } from "next/server";

import { createAIUsageService } from "@/server/adapters/core/ai-core.adapter";
import { getSessionUser } from "@/server/auth/require-user";
import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import { AIBudgetsRepo } from "@/server/db-repos/ai-budgets.repo";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const orgId = user.organizationId;
  try {
    await withRequiredOrgScope({
      organizationId: orgId,
      action: "ai:usage:read",
      run: async () => undefined,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const usageService = createAIUsageService();
  const plan = await usageService.getOrgPlan(orgId);
  const normalizedPlan = normalizePlan(plan);
  const policyEntry = AI_POLICY[normalizedPlan];
  const quota = policyEntry.monthlyTokens;

  const budget = await new AIBudgetsRepo().findByOrg(orgId);
  const budgetUsd = budget?.monthlyBudgetUsd ?? policyEntry.monthlyBudgetUsd;
  const alertThresholdPct = budget?.alertThresholdPct ?? 80;
  const hardStopEnabled = budget?.hardStopEnabled ?? true;

  const { start, end } = getMonthRange();
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

  const userIds = Array.from(new Set(rows.map((row) => row.userId)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true },
  });

  const report = buildAIUsageReport({
    rows,
    users,
    budgetUsd,
    alertThresholdPct,
    hardStopEnabled,
  });

  return NextResponse.json({
    ok: true,
    plan,
    model: policyEntry.model,
    rpm: policyEntry.rpm,
    quota,
    monthly: report.monthly,
    budget: report.budget,
    daily: report.daily,
    users: report.users,
  });
}
