import "server-only";

import { AIUsagePanel } from "@/features/ai-usage/ui";
import { requireUser } from "@/server/auth/require-user";

export default async function AIUsagePage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">AI Usage</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Track tokens and costs for your organization. Quotas reset monthly.
        </p>
      </div>

      <AIUsagePanel />
    </div>
  );
}
