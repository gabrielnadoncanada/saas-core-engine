import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

describe("AI tools contract", () => {
  const files = [
    "src/server/ai/tools/tools/org.get.ts",
    "src/server/ai/tools/tools/subscription.get.ts",
    "src/server/ai/tools/tools/users.list.ts",
  ];

  it("all tools define timeout, retries and authorize", () => {
    for (const file of files) {
      const content = read(file);
      expect(content).toContain("timeoutMs:");
      expect(content).toContain("retries:");
      expect(content).toContain("authorize:");
    }
  });
});
