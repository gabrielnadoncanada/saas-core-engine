import "@/server/config/server-only";

import { z } from "zod";

const boolFromString = z
  .union([z.literal("true"), z.literal("false")])
  .transform((v) => v === "true");

const numberFromString = z
  .string()
  .regex(/^\d+$/, "Must be a number string")
  .transform((v) => Number(v));

const boundedNumberFromString = (
  min: number,
  max: number,
  defaultValue: string,
) =>
  z.preprocess(
    (value) => (value === undefined ? defaultValue : value),
    numberFromString.refine((v) => v >= min && v <= max, {
      message: `Must be between ${min} and ${max}`,
    }),
  );

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    APP_NAME: z.string().min(1),
    APP_URL: z.string().url(),

    // Cookies/Sessions
    SESSION_COOKIE_NAME: z.string().min(1).default("session"),
    SESSION_COOKIE_SECURE: boolFromString.default("false"),
    SESSION_COOKIE_SAME_SITE: z
      .enum(["lax", "strict", "none"])
      .default("lax"),
    SESSION_TTL_DAYS: boundedNumberFromString(1, 365, "30"),
    SESSION_IDLE_TIMEOUT_MINUTES: boundedNumberFromString(5, 24 * 60, "120"),
    TOKEN_PEPPER: z.string().min(32),

    // Database
    DATABASE_URL: z.string().min(1),

    // Email
    EMAIL_FROM: z.string().min(3),
    RESEND_API_KEY: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: numberFromString.optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),

    // OAuth - Google
    GOOGLE_OAUTH_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
    GOOGLE_OAUTH_REDIRECT_URI: z.string().url().optional(),
    GOOGLE_OAUTH_SCOPES: z.string().default("openid email profile"),
    AUTH_SIGNIN_EMAIL_ENABLED: boolFromString.default("true"),
    AUTH_SIGNIN_GOOGLE_ENABLED: boolFromString.default("false"),
    AUTH_SIGNIN_GITHUB_ENABLED: boolFromString.default("false"),
    GITHUB_OAUTH_CLIENT_ID: z.string().min(1).optional(),
    GITHUB_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
    GITHUB_OAUTH_REDIRECT_URI: z.string().url().optional(),
    GITHUB_OAUTH_SCOPES: z.string().default("read:user user:email"),

    // Stripe
    BILLING_ENABLED: boolFromString.default("false"),
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    STRIPE_PRICE_PRO_MONTHLY: z.string().min(1).optional(),
    STRIPE_PRICE_PRO_YEARLY: z.string().optional(),
    STRIPE_SUCCESS_URL: z.string().url().optional(),
    STRIPE_CANCEL_URL: z.string().url().optional(),

    // Rate limiting
    RATE_LIMIT_ENABLED: boolFromString.default("true"),
    RATE_LIMIT_WINDOW_SECONDS: boundedNumberFromString(1, 3600, "60"),
    RATE_LIMIT_MAX_REQUESTS: boundedNumberFromString(1, 10_000, "10"),
    RATE_LIMIT_RETENTION_SECONDS: boundedNumberFromString(300, 2_592_000, "86400"),
    TRUST_PROXY_HEADERS: boolFromString.default("false"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    HSTS_MAX_AGE_SECONDS: boundedNumberFromString(300, 63_072_000, "31536000"),
    DEMO_MODE: boolFromString.default("false"),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === "production" && !value.SESSION_COOKIE_SECURE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SESSION_COOKIE_SECURE"],
        message: "SESSION_COOKIE_SECURE must be true in production",
      });
    }

    if (value.SESSION_COOKIE_SAME_SITE === "none" && !value.SESSION_COOKIE_SECURE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SESSION_COOKIE_SAME_SITE"],
        message: "SESSION_COOKIE_SAME_SITE=none requires SESSION_COOKIE_SECURE=true",
      });
    }

    if (value.NODE_ENV === "production" && !value.RESEND_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RESEND_API_KEY"],
        message: "RESEND_API_KEY is required in production",
      });
    }

    if (value.AUTH_SIGNIN_GOOGLE_ENABLED) {
      if (!value.GOOGLE_OAUTH_CLIENT_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["GOOGLE_OAUTH_CLIENT_ID"],
          message: "GOOGLE_OAUTH_CLIENT_ID is required when AUTH_SIGNIN_GOOGLE_ENABLED=true",
        });
      }
      if (!value.GOOGLE_OAUTH_CLIENT_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["GOOGLE_OAUTH_CLIENT_SECRET"],
          message: "GOOGLE_OAUTH_CLIENT_SECRET is required when AUTH_SIGNIN_GOOGLE_ENABLED=true",
        });
      }
      if (!value.GOOGLE_OAUTH_REDIRECT_URI) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["GOOGLE_OAUTH_REDIRECT_URI"],
          message: "GOOGLE_OAUTH_REDIRECT_URI is required when AUTH_SIGNIN_GOOGLE_ENABLED=true",
        });
      }
    }

    if (value.AUTH_SIGNIN_GITHUB_ENABLED) {
      if (!value.GITHUB_OAUTH_CLIENT_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["GITHUB_OAUTH_CLIENT_ID"],
          message: "GITHUB_OAUTH_CLIENT_ID is required when AUTH_SIGNIN_GITHUB_ENABLED=true",
        });
      }
      if (!value.GITHUB_OAUTH_CLIENT_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["GITHUB_OAUTH_CLIENT_SECRET"],
          message: "GITHUB_OAUTH_CLIENT_SECRET is required when AUTH_SIGNIN_GITHUB_ENABLED=true",
        });
      }
      if (!value.GITHUB_OAUTH_REDIRECT_URI) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["GITHUB_OAUTH_REDIRECT_URI"],
          message: "GITHUB_OAUTH_REDIRECT_URI is required when AUTH_SIGNIN_GITHUB_ENABLED=true",
        });
      }
    }

    if (value.BILLING_ENABLED) {
      if (!value.STRIPE_SECRET_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["STRIPE_SECRET_KEY"],
          message: "STRIPE_SECRET_KEY is required when BILLING_ENABLED=true",
        });
      }
      if (!value.STRIPE_WEBHOOK_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["STRIPE_WEBHOOK_SECRET"],
          message: "STRIPE_WEBHOOK_SECRET is required when BILLING_ENABLED=true",
        });
      }
      if (!value.STRIPE_PUBLISHABLE_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["STRIPE_PUBLISHABLE_KEY"],
          message: "STRIPE_PUBLISHABLE_KEY is required when BILLING_ENABLED=true",
        });
      }
      if (!value.STRIPE_PRICE_PRO_MONTHLY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["STRIPE_PRICE_PRO_MONTHLY"],
          message: "STRIPE_PRICE_PRO_MONTHLY is required when BILLING_ENABLED=true",
        });
      }
      if (!value.STRIPE_SUCCESS_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["STRIPE_SUCCESS_URL"],
          message: "STRIPE_SUCCESS_URL is required when BILLING_ENABLED=true",
        });
      }
      if (!value.STRIPE_CANCEL_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["STRIPE_CANCEL_URL"],
          message: "STRIPE_CANCEL_URL is required when BILLING_ENABLED=true",
        });
      }
    }
  });

// Validate once at startup (server-only file)
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
   
  console.error(
    "Invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Invalid environment variables. Check your .env");
}

export const env = parsed.data;

// Helpful derived values
export const isProd = env.NODE_ENV === "production";
