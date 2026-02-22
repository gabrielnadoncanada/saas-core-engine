import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@db": fileURLToPath(new URL("../../packages/db/src/index.ts", import.meta.url)),
      "@org-core": fileURLToPath(
        new URL("../../packages/org-core/src/index.ts", import.meta.url),
      ),
      "@billing-core": fileURLToPath(
        new URL("../../packages/billing-core/src/index.ts", import.meta.url),
      ),
      "@contracts": fileURLToPath(
        new URL("../../packages/contracts/src/index.ts", import.meta.url),
      ),
      "@rbac-core": fileURLToPath(
        new URL("../../packages/rbac-core/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
