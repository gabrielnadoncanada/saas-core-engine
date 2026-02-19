// apps/web/next.config.js
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Important for monorepos (workspace packages)
  transpilePackages: [
    "@ai-core",
    "@contracts",
    "@db",
    "@auth-core",
    "@org-core",
    "@billing-core",
    "@email",
    "@ui"
  ],

  // Keep secrets server-side; avoid bundling server libs into client by mistake
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
