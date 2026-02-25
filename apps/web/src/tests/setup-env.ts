import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";

// Load monorepo env first, then app-local overrides.
loadEnv({ path: resolve(process.cwd(), "../../.env.local") });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });
