/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

type CheckResult = {
  name: string;
  ok: boolean;
  details?: string;
};

const root = process.cwd();

function abs(rel: string): string {
  return path.join(root, rel);
}

function fileExists(rel: string): boolean {
  return fs.existsSync(abs(rel));
}

function read(rel: string): string {
  return fs.readFileSync(abs(rel), "utf8");
}

function checkFile(rel: string, name: string): CheckResult {
  const ok = fileExists(rel);
  return {
    name,
    ok,
    details: ok ? undefined : `Missing file: ${rel}`,
  };
}

function checkContains(rel: string, pattern: string, name: string): CheckResult {
  if (!fileExists(rel)) {
    return {
      name,
      ok: false,
      details: `Missing file: ${rel}`,
    };
  }
  const ok = read(rel).includes(pattern);
  return {
    name,
    ok,
    details: ok ? undefined : `Pattern not found in ${rel}: ${pattern}`,
  };
}

function checkPrismaMigrationsReady(): CheckResult {
  const schemaPath = "packages/db/prisma/schema.prisma";
  if (!fileExists(schemaPath)) {
    return {
      name: "Prisma schema exists",
      ok: false,
      details: `Missing ${schemaPath}`,
    };
  }

  const migrationsDir = abs("packages/db/prisma/migrations");
  if (!fs.existsSync(migrationsDir)) {
    return {
      name: "Prisma migrations directory exists",
      ok: false,
      details: "Missing packages/db/prisma/migrations.",
    };
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(migrationsDir, entry.name, "migration.sql"))
    .filter((candidate) => fs.existsSync(candidate));

  if (migrationFiles.length === 0) {
    return {
      name: "Prisma migrations include at least one migration.sql",
      ok: false,
      details: "No migration.sql found under packages/db/prisma/migrations/*.",
    };
  }

  return {
    name: "Prisma migrations include at least one migration.sql",
    ok: true,
  };
}

function checkTelemetryCoverage(): CheckResult {
  const criticalRoutes = [
    "apps/web/src/app/api/auth/login/route.ts",
    "apps/web/src/app/api/auth/signup/route.ts",
    "apps/web/src/app/api/auth/logout/route.ts",
    "apps/web/src/app/api/auth/magic/request/route.ts",
    "apps/web/src/app/api/auth/magic/confirm/route.ts",
    "apps/web/src/app/api/auth/password/forgot/route.ts",
    "apps/web/src/app/api/auth/password/reset/route.ts",
    "apps/web/src/app/api/auth/oauth/google/start/route.ts",
    "apps/web/src/app/api/auth/oauth/google/callback/route.ts",
    "apps/web/src/app/api/org/invite/accept/route.ts",
    "apps/web/src/app/api/billing/webhook/route.ts",
    "apps/web/src/app/api/health/route.ts",
    "apps/web/src/app/api/ready/route.ts",
  ];

  const missing: string[] = [];
  for (const rel of criticalRoutes) {
    if (!fileExists(rel) || !read(rel).includes("withApiTelemetry(")) {
      missing.push(rel);
    }
  }

  return {
    name: "Telemetry wrapper covers critical API routes",
    ok: missing.length === 0,
    details:
      missing.length === 0
        ? undefined
        : `Missing withApiTelemetry in: ${missing.join(", ")}`,
  };
}

function checkOrgScopeEnforcement(): CheckResult {
  const scopedFiles = [
    "apps/web/src/features/team/api/invites.action.ts",
    "apps/web/src/features/team/api/org.action.ts",
    "apps/web/src/features/team/api/members.action.ts",
    "apps/web/src/features/rbac/api/rbac.action.ts",
  ];

  const missing: string[] = [];
  for (const rel of scopedFiles) {
    if (!fileExists(rel) || !read(rel).includes("withRequiredOrgScope(")) {
      missing.push(rel);
    }
  }

  return {
    name: "Org scope is centrally enforced on sensitive org actions",
    ok: missing.length === 0,
    details:
      missing.length === 0
        ? undefined
        : `Missing withRequiredOrgScope in: ${missing.join(", ")}`,
  };
}

function run(): number {
  const checks: CheckResult[] = [
    checkFile(".github/workflows/release.yml", "Release workflow exists"),
    checkFile(".github/workflows/rollback.yml", "Rollback workflow exists"),
    checkFile("packages/rbac-core/src/index.ts", "RBAC core package exists"),
    checkContains(
      "packages/rbac-core/src/index.ts",
      "export function can(",
      "RBAC exposes can(...)",
    ),
    checkContains(
      "packages/rbac-core/src/index.ts",
      "export function requirePermission(",
      "RBAC exposes requirePermission(...)",
    ),
    checkContains(
      "packages/db/prisma/schema.prisma",
      "model Role {",
      "V2 RBAC roles model exists",
    ),
    checkContains(
      "packages/db/prisma/schema.prisma",
      "model MembershipRoleAssignment {",
      "V2 membership_roles model exists",
    ),
    checkContains(
      "apps/web/src/features/rbac/api/rbac.action.ts",
      "listRolesAction",
      "RBAC roles action exists",
    ),
    checkContains(
      "apps/web/src/features/rbac/api/rbac.action.ts",
      "setRolePermissionsAction",
      "RBAC role permissions action exists",
    ),
    checkContains(
      "apps/web/src/features/rbac/api/rbac.action.ts",
      "setMemberRolesAction",
      "RBAC membership role assignment action exists",
    ),
    checkFile("docs/operations/runbook-rbac-v2.md", "RBAC V2 runbook exists"),
    checkFile("apps/web/src/app/api/health/route.ts", "Health endpoint exists"),
    checkFile("apps/web/src/app/api/ready/route.ts", "Readiness endpoint exists"),
    checkFile("docs/operations/slo.md", "SLO document exists"),
    checkFile("docs/operations/alerting.md", "Alerting policy exists"),
    checkFile("docs/operations/dashboards.md", "Dashboard spec exists"),
    checkPrismaMigrationsReady(),
    checkTelemetryCoverage(),
    checkOrgScopeEnforcement(),
    checkContains(
      "apps/web/src/server/config/env.ts",
      "SESSION_COOKIE_SECURE must be true in production",
      "Production cookie invariant exists",
    ),
    checkFile("tooling/scripts/webhook-replay.ts", "Webhook replay CLI exists"),
    checkFile("docs/operations/runbook-webhook-retry-v3.md", "V3 webhook runbook exists"),
  ];

  let failed = 0;
  for (const check of checks) {
    if (check.ok) {
      console.log(`PASS: ${check.name}`);
    } else {
      failed += 1;
      console.error(`FAIL: ${check.name}`);
      if (check.details) console.error(`      ${check.details}`);
    }
  }

  if (failed > 0) {
    console.error(`\nPreflight failed with ${failed} check(s).`);
    return 1;
  }

  console.log("\nPreflight passed.");
  return 0;
}

process.exit(run());
