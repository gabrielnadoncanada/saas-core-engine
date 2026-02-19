// eslint.config.mjs
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import unusedImports from "eslint-plugin-unused-imports";

// Optional (si tu veux ajouter plus tard):
// import reactPlugin from "eslint-plugin-react";
// import reactHooks from "eslint-plugin-react-hooks";

export default [
  // Ignore build outputs
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/build/**",
      "**/coverage/**",
      "**/prisma/migrations/**",
      "**/tailwind.config.ts",
      "**/vitest.config.ts",
    ],
  },

  js.configs.recommended,

  ...tseslint.configs.recommendedTypeChecked.map((c) => ({
    ...c,
    files: ["**/*.ts", "**/*.tsx"],
  })),

  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        // monorepo: ESLint TS type-aware
        project: [
          "./apps/*/tsconfig.json",
          "./packages/*/tsconfig.json",
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      import: importPlugin,
      "unused-imports": unusedImports,
    },
    rules: {
      // ---- Code quality
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-debugger": "error",

      // ---- Imports hygiene
      "unused-imports/no-unused-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // ---- TypeScript strictness
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "warn",
      "@typescript-eslint/require-await": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/no-base-to-string": "warn",
      "@typescript-eslint/no-redundant-type-constituents": "warn",

      // ---- Import order (simple, stable)
      "import/order": [
        "error",
        {
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
            "object",
            "type",
          ],
        },
      ],
    },
  },

  {
    files: [
      "apps/web/src/app/api/ai/**/*.{ts,tsx}",
      "apps/web/src/features/ai/**/*.{ts,tsx}",
      "apps/web/src/features/ai-*/**/*.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },

  {
    files: [
      "apps/web/src/app/api/ai/chat/route.ts",
      "apps/web/src/features/ai/ui/ai-chat.tsx",
    ],
    rules: {
      "@typescript-eslint/require-await": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/no-base-to-string": "warn",
      "@typescript-eslint/no-redundant-type-constituents": "warn",
      "@typescript-eslint/no-misused-promises": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  },

  {
    files: [
      "apps/web/src/server/logging/auth-event-emitter.ts",
      "apps/web/src/server/logging/logger.ts",
    ],
    rules: {
      "no-console": "off",
    },
  },

  // ✅ Architecture boundaries (anti-spaghetti)
  // 1) packages/ui ne doit jamais dépendre de db/auth-core/billing-core/org-core
  {
    files: ["packages/ui/**/*.{ts,tsx}"],
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./packages/ui",
              from: "./packages/db",
              message: "ui package must not import db.",
            },
            {
              target: "./packages/ui",
              from: "./packages/auth-core",
              message: "ui package must not import auth-core.",
            },
            {
              target: "./packages/ui",
              from: "./packages/billing-core",
              message: "ui package must not import billing-core.",
            },
            {
              target: "./packages/ui",
              from: "./packages/org-core",
              message: "ui package must not import org-core.",
            },
          ],
        },
      ],
    },
  },

  // 2) contracts ne dépend de rien (enforced by restricting imports)
  {
    files: ["packages/contracts/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: ["@db", "@prisma/client"],
          patterns: [
            "@db",
            "@db/*",
            "@auth-core/*",
            "@billing-core/*",
            "@org-core/*",
            "@email/*",
            "@ui/*",
            "../db/*",
            "../auth-core/*",
            "../billing-core/*",
            "../org-core/*",
            "../email/*",
            "../ui/*",
          ],
        },
      ],
    },
  },

  // 3) packages/* core must not import from apps/*
  {
    files: ["packages/**/*.{ts,tsx}"],
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./packages",
              from: "./apps",
              message: "packages must not import from apps.",
            },
          ],
        },
      ],
    },
  },

  // 4) packages/*-core and contracts must stay infra-agnostic
  {
    files: ["packages/*-core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@db", message: "Core packages must not depend on db adapters or Prisma." },
            { name: "@prisma/client", message: "Core packages must not depend on Prisma." },
            { name: "next/headers", message: "Core packages must not use Next runtime APIs." },
            { name: "next/server", message: "Core packages must not use Next runtime APIs." },
            { name: "next/navigation", message: "Core packages must not use Next runtime APIs." },
          ],
          patterns: ["@db/*", "next/*"],
        },
      ],
    },
  },

  // 5) Next server-only boundaries: forbid packages from importing next/*
  {
    files: ["packages/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "next/headers", message: "Core packages must not use Next runtime APIs." },
            { name: "next/server", message: "Core packages must not use Next runtime APIs." },
            { name: "next/navigation", message: "Core packages must not use Next runtime APIs." },
          ],
          patterns: ["next/*"],
        },
      ],
    },
  },
];
