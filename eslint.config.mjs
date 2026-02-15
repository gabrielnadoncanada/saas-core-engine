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
          "./tsconfig.json",
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
      "@typescript-eslint/no-misused-promises": "error",

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
