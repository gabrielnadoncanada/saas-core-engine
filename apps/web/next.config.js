// apps/web/next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Important for monorepos (workspace packages)
  transpilePackages: [
    "@contracts",
    "@db",
    "@auth-core",
    "@org-core",
    "@billing-core",
    "@email"
  ],

  // Keep secrets server-side; avoid bundling server libs into client by mistake
  serverExternalPackages: ["pg"],
};

export default nextConfig;
