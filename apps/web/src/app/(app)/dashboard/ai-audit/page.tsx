import "server-only";

import { AIAuditPanel } from "@/features/ai-audit/ui/ai-audit-panel";
import { requireUser } from "@/server/auth/require-user";

export default async function AIAuditPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">AI Audit Log</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every AI call is tracked: user, model, tokens, cost, and outcome.
        </p>
      </div>

      <AIAuditPanel />
    </div>
  );
}
