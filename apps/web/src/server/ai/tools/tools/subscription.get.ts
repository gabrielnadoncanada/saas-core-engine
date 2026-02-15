import "server-only";
import { z } from "zod";
import type { AITool } from "@ai-core";
import { prisma } from "@db";

export const subscriptionGetTool: AITool = {
  name: "subscription.get",
  description: "Get subscription status and plan for the current organization.",
  schema: z.object({}),
  async execute(_args, ctx) {
    const sub = await prisma.subscription.findUnique({
      where: { organizationId: ctx.orgId },
      select: { plan: true, status: true, currentPeriodEnd: true },
    });
    return { subscription: sub ?? { plan: "free", status: "none" } };
  },
};
