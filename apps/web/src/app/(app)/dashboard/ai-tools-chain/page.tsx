import "server-only";
import { requireUser } from "@/server/auth/require-user";
import { AIToolsChainDemo } from "@/features/ai-tools-chain/ui/ai-tools-chain-demo";

export default async function AIToolsChainPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">AI Tool Chaining</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Up to 3 tool calls per request. Includes a timeline inspector (pick → args → result → final answer).
        </p>
      </div>

      <AIToolsChainDemo />
    </div>
  );
}
