import { prisma } from "@db";

export class AIUsageRepo {
  async aggregateOrgMonthlyUsage(params: {
    organizationId: string;
    start: Date;
    end: Date;
  }): Promise<{ inputTokens: number; outputTokens: number; costUsd: number }> {
    const agg = await prisma.aIUsage.aggregate({
      where: {
        organizationId: params.organizationId,
        createdAt: { gte: params.start, lt: params.end },
      },
      _sum: { inputTokens: true, outputTokens: true, costUsd: true },
    });

    return {
      inputTokens: agg._sum.inputTokens ?? 0,
      outputTokens: agg._sum.outputTokens ?? 0,
      costUsd: agg._sum.costUsd ?? 0,
    };
  }
}

