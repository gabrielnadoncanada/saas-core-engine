import "server-only";
import { prisma } from "@db";
import { z } from "zod";

import type { AITool } from "@ai-core";

export const subscriptionGetTool: AITool = {
  name: "subscription.get",
  description: "Get subscription status and plan for the current organization.",
  schema: z.object({}),
  timeoutMs: 2000,
  retries: 1,
  authorize: (ctx) => Boolean(ctx.orgId && ctx.userId),
  async execute(_args, ctx) {
    z.object({}).parse(_args);
    const sub = await prisma.subscription.findUnique({
      where: { organizationId: ctx.orgId },
      select: { plan: true, status: true, currentPeriodEnd: true },
    });
    return { subscription: sub ?? { plan: "free", status: "none" } };
  },
};
