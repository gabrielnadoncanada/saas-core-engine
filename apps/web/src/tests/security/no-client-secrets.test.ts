import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src");
const forbiddenPatterns = [
  "STRIPE_SECRET_KEY",
  "RESEND_API_KEY",
  "TOKEN_PEPPER",
  "DATABASE_URL",
];

function walk(dir: string): string[] {
  if (dir.includes(`${join("src", "tests")}`)) return [];

  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);

    if (stat.isDirectory()) {
      files.push(...walk(full));
      continue;
    }

    if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      files.push(full);
    }
  }

  return files;
}

describe("security: no secrets in client components", () => {
  it("does not expose server secrets in files marked as use client", () => {
    const clientFiles = walk(root).filter((file) => {
      const content = readFileSync(file, "utf8");
      return content.includes('"use client"') || content.includes("'use client'");
    });

    const offenders: string[] = [];

    for (const file of clientFiles) {
      const content = readFileSync(file, "utf8");
      if (forbiddenPatterns.some((pattern) => content.includes(pattern))) {
        offenders.push(file);
      }
    }

    expect(offenders).toEqual([]);
  });
});
