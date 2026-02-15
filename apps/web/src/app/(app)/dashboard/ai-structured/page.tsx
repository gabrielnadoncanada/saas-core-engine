import "server-only";
import { requireUser } from "@/server/auth/require-user";
import { AIStructuredDemo } from "@/features/ai-structured/ui/ai-structured-demo";

export default async function AIStructuredPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">AI Structured Output</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Generate validated JSON from natural language using a schema.
        </p>
      </div>

      <AIStructuredDemo />
    </div>
  );
}
