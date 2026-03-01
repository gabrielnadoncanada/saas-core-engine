/* eslint-disable no-console */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type Step = { name: string; cmd: string; args: string[]; cwd?: string };

function run(cmd: string, args: string[], cwd?: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed (${code}): ${cmd} ${args.join(" ")}`));
    });
  });
}

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf8");

  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function loadEnvFiles() {
  const root = process.cwd();
  const candidates = [
    path.join(root, ".env"), // legacy fallback
    path.join(root, "packages", "db", ".env"),
    path.join(root, "apps", "web", ".env.local"),
    path.join(root, "apps", "web", ".env"),
  ];

  for (const envPath of candidates) {
    const parsed = parseEnvFile(envPath);
    for (const [k, v] of Object.entries(parsed)) {
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

function getBool(v: string | undefined) {
  return (v ?? "").toLowerCase() === "true";
}

function requireEnv(keys: string[]) {
  const missing: string[] = [];
  for (const k of keys) {
    if (!process.env[k] || process.env[k]!.trim() === "") missing.push(k);
  }
  if (missing.length) {
    console.error("\nMissing required env vars:");
    for (const k of missing) console.error(`- ${k}`);
    console.error(
      "\nConfigure apps/web/.env.local and packages/db/.env, then re-run: pnpm setup\n",
    );
    process.exit(1);
  }
}

async function main() {
  loadEnvFiles();

  requireEnv(["DATABASE_URL", "TOKEN_PEPPER", "APP_URL"]);

  const demo = getBool(process.env.DEMO_MODE);

  const steps: Step[] = [
    { name: "Install deps", cmd: "pnpm", args: ["i"] },
    {
      name: "Prisma generate",
      cmd: "pnpm",
      args: ["--filter", "./packages/db", "exec", "prisma", "generate"],
    },
    {
      name: "Apply database migrations",
      cmd: "pnpm",
      args: ["--filter", "./packages/db", "exec", "prisma", "migrate", "deploy"],
    },
  ];

  if (demo) {
    steps.push({
      name: "Seed demo data",
      cmd: "pnpm",
      args: ["--filter", "./packages/db", "run", "seed:demo"],
    });
  }

  console.log("\n=== Setup ===");
  console.log(`Demo mode: ${demo ? "ON" : "OFF"}\n`);

  for (const s of steps) {
    console.log(`\n> ${s.name}`);
    await run(s.cmd, s.args, s.cwd);
  }

  console.log("\nSetup complete.");
  console.log("\nNext:");
  console.log("- pnpm dev");
  if (demo) {
    console.log("- Login: demo@saastemplate.dev / DemoPassw0rd!");
  }
}

main().catch((e) => {
  console.error("\nSetup failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
