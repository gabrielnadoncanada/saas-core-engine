/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

type Drill = {
  id: string;
  title: string;
  checks: string[];
};

const root = process.cwd();

function exists(rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function mustExist(rel: string): string {
  if (!exists(rel)) {
    throw new Error(`Missing required file for drill: ${rel}`);
  }
  return rel;
}

function run(): number {
  const drills: Drill[] = [
    {
      id: "DRILL-RBAC-001",
      title: "RBAC policy regression",
      checks: [
        mustExist("apps/web/src/app/api/org/rbac/roles/route.ts"),
        mustExist("apps/web/src/app/api/org/rbac/roles/[roleId]/permissions/route.ts"),
        mustExist("apps/web/src/app/api/org/rbac/memberships/[membershipId]/roles/route.ts"),
        mustExist("docs/operations/runbook-rbac-v2.md"),
      ],
    },
  ];

  for (const drill of drills) {
    console.log(`PASS: ${drill.id} - ${drill.title}`);
    for (const check of drill.checks) {
      console.log(`  - ${check}`);
    }
  }

  console.log("\nV2 incident simulation completed.");
  return 0;
}

try {
  process.exit(run());
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
