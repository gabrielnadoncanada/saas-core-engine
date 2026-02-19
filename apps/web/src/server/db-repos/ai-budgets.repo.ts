import { prisma } from "@db";

export class AIBudgetsRepo {
  async findByOrg(organizationId: string) {
    return prisma.aIBudget.findUnique({
      where: { organizationId },
      select: {
        monthlyBudgetUsd: true,
        alertThresholdPct: true,
        hardStopEnabled: true,
      },
    });
  }

  async upsert(params: {
    organizationId: string;
    monthlyBudgetUsd: number;
    alertThresholdPct: number;
    hardStopEnabled: boolean;
  }) {
    return prisma.aIBudget.upsert({
      where: { organizationId: params.organizationId },
      create: params,
      update: {
        monthlyBudgetUsd: params.monthlyBudgetUsd,
        alertThresholdPct: params.alertThresholdPct,
        hardStopEnabled: params.hardStopEnabled,
      },
    });
  }
}
