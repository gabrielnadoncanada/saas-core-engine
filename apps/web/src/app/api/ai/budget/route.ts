import { AI_POLICY, normalizePlan } from "@ai-core";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createAIUsageService } from "@/server/adapters/core/ai-core.adapter";
import { getSessionUser } from "@/server/auth/require-user";
import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import { AIBudgetsRepo } from "@/server/db-repos/ai-budgets.repo";

const BodySchema = z.object({
  monthlyBudgetUsd: z.number().min(0).max(100000),
  alertThresholdPct: z.number().int().min(1).max(100),
  hardStopEnabled: z.boolean(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await withRequiredOrgScope({
      organizationId: user.organizationId,
      action: "ai:usage:read",
      run: async () => undefined,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const usage = createAIUsageService();
  const plan = normalizePlan(await usage.getOrgPlan(user.organizationId));
  const defaults = AI_POLICY[plan];
  const budget = await new AIBudgetsRepo().findByOrg(user.organizationId);

  return NextResponse.json({
    ok: true,
    budget: {
      monthlyBudgetUsd: budget?.monthlyBudgetUsd ?? defaults.monthlyBudgetUsd,
      alertThresholdPct: budget?.alertThresholdPct ?? 80,
      hardStopEnabled: budget?.hardStopEnabled ?? true,
      source: budget ? "custom" : "plan-default",
    },
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await withRequiredOrgScope({
      organizationId: user.organizationId,
      action: "ai:prompts:manage",
      run: async () => undefined,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }

  const updated = await new AIBudgetsRepo().upsert({
    organizationId: user.organizationId,
    ...parsed.data,
  });

  return NextResponse.json({
    ok: true,
    budget: {
      monthlyBudgetUsd: updated.monthlyBudgetUsd,
      alertThresholdPct: updated.alertThresholdPct,
      hardStopEnabled: updated.hardStopEnabled,
      source: "custom",
    },
  });
}
