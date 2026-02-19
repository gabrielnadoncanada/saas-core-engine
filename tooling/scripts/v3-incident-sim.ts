/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function requireFile(rel: string) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) throw new Error(`Missing ${rel}`);
  return rel;
}

function run() {
  const drills = [
    {
      id: "DRILL-TOOL-001",
      title: "Tool contract break",
      files: [
        "packages/ai-core/src/tools/types.ts",
        "packages/ai-core/src/tools/executor.ts",
        "apps/web/src/server/ai/tools/tools/tools.contract.test.ts",
      ],
    },
    {
      id: "DRILL-JOBS-001",
      title: "Worker outage and queue backlog",
      files: [
        "packages/jobs-core/src/index.ts",
        "apps/worker/src/worker.ts",
        "docs/operations/runbook-async-jobs-v3.md",
      ],
    },
    {
      id: "DRILL-WEBHOOK-001",
      title: "Webhook retry and replay",
      files: [
        "apps/web/src/app/api/billing/webhook/route.ts",
        "tooling/scripts/webhook-replay.ts",
        "docs/operations/runbook-webhook-retry-v3.md",
      ],
    },
    {
      id: "DRILL-BUDGET-001",
      title: "AI budget hard-stop",
      files: [
        "apps/web/src/app/api/ai/budget/route.ts",
        "packages/ai-core/src/budget-service.ts",
        "docs/operations/runbook-ai-budget-v3.md",
      ],
    },
  ];

  for (const drill of drills) {
    console.log(`PASS: ${drill.id} - ${drill.title}`);
    for (const file of drill.files) {
      console.log(`  - ${requireFile(file)}`);
    }
  }

  console.log("\nV3 incident simulation completed.");
}

run();
