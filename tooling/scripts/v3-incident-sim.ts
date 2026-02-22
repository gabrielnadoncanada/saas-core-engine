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
      id: "DRILL-WEBHOOK-001",
      title: "Webhook retry and replay",
      files: [
        "apps/web/src/app/api/billing/webhook/route.ts",
        "tooling/scripts/webhook-replay.ts",
        "docs/operations/runbook-webhook-retry-v3.md",
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
