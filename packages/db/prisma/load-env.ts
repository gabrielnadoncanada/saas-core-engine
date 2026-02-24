import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load base files first, then local overrides.
const envPaths = [
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../apps/web/.env"),
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, "../../.env.local"),
  path.resolve(__dirname, "../../apps/web/.env.local"),
  path.resolve(__dirname, "../.env.local"),
];

for (const envPath of envPaths) {
  loadEnv({ path: envPath, override: true });
}
