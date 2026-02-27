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
    files: ["apps/web/src/**/*.action.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportNamedDeclaration[declaration.type='VariableDeclaration']",
          message:
            "Server Action files must export only async function declarations. Move constants/state/types to model files.",
        },
        {
          selector: "ExportNamedDeclaration[declaration.type='FunctionDeclaration'][declaration.async=false]",
          message: "Server Action exports must be async functions.",
        },
        {
          selector: "ExportNamedDeclaration[declaration.type='TSTypeAliasDeclaration']",
          message:
            "Do not export types from Server Action files. Export from model/*.form-state.ts or model/*.schema.ts.",
        },
        {
          selector: "ExportNamedDeclaration[declaration.type='TSInterfaceDeclaration']",
          message:
            "Do not export types from Server Action files. Export from model/*.form-state.ts or model/*.schema.ts.",
        },
        {
          selector: "ExportNamedDeclaration[declaration.type='ClassDeclaration']",
          message: "Server Action files must export only async functions.",
        },
        {
          selector: "ExportNamedDeclaration[declaration.type='TSEnumDeclaration']",
          message: "Server Action files must export only async functions.",
        },
        {
          selector: "ExportNamedDeclaration[source]",
          message: "Re-exports are forbidden in Server Action files.",
        },
        {
          selector: "ExportNamedDeclaration[specifiers.length>0]",
          message: "Named export lists are forbidden in Server Action files.",
        },
        {
          selector: "ExportDefaultDeclaration",
          message: "Default exports are forbidden in Server Action files.",
        },
      ],
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

  // ✅ Conversion budget guardrails — ban unsafe casts outside mappers/repos/tests
  {
    files: [
      "apps/web/src/app/**/*.{ts,tsx}",
      "apps/web/src/features/**/*.{ts,tsx}",
      "apps/web/src/shared/**/*.{ts,tsx}",
    ],
    ignores: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/mappers/**",
      "**/mapper.*",
    ],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "TSAsExpression > TSUnknownKeyword",
          message:
            "Avoid `as unknown as X` outside mappers. Use a mapper function or fix the type at the source.",
        },
      ],
    },
  },

  // ✅ Architecture boundaries (anti-spaghetti)
  // 1) contracts ne dépend de rien (enforced by restricting imports)
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
            "../db/*",
            "../auth-core/*",
            "../billing-core/*",
            "../org-core/*",
            "../email/*",
          ],
        },
      ],
    },
  },

  // 2) packages/* core must not import from apps/*
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

  // 3) packages/*-core and contracts must stay infra-agnostic
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

  // 4) Next server-only boundaries: forbid packages from importing next/*
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
