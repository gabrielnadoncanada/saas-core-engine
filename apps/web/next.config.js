// apps/web/next.config.js
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
  experimental: {
    serverExternalPackages: [
      "@prisma/client"
    ]
  }
};

export default nextConfig;
