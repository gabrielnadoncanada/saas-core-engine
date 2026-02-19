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
    GOOGLE_OAUTH_CLIENT_ID: z.string().min(1),
    GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1),
    GOOGLE_OAUTH_REDIRECT_URI: z.string().url(),
    GOOGLE_OAUTH_SCOPES: z.string().default("openid email profile"),

    // Stripe
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    STRIPE_PUBLISHABLE_KEY: z.string().min(1),

    STRIPE_PRICE_PRO_MONTHLY: z.string().min(1),
    STRIPE_PRICE_PRO_YEARLY: z.string().optional(),

    STRIPE_SUCCESS_URL: z.string().url(),
    STRIPE_CANCEL_URL: z.string().url(),

    // Rate limiting
    RATE_LIMIT_ENABLED: boolFromString.default("true"),
    RATE_LIMIT_WINDOW_SECONDS: boundedNumberFromString(1, 3600, "60"),
    RATE_LIMIT_MAX_REQUESTS: boundedNumberFromString(1, 10_000, "10"),
    ORG_INVITE_RATE_LIMIT_ENABLED: boolFromString.default("true"),
    ORG_INVITE_RATE_LIMIT_WINDOW_SECONDS: boundedNumberFromString(1, 3600, "60"),
    ORG_INVITE_RATE_LIMIT_MAX_REQUESTS_PER_ACTOR: boundedNumberFromString(
      1,
      10_000,
      "20",
    ),
    ORG_INVITE_RATE_LIMIT_MAX_REQUESTS_PER_IP: boundedNumberFromString(
      1,
      10_000,
      "60",
    ),
    TRUST_PROXY_HEADERS: boolFromString.default("false"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    HSTS_MAX_AGE_SECONDS: boundedNumberFromString(300, 63_072_000, "31536000"),
    OTEL_ENABLED: boolFromString.default("false"),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
    OTEL_EXPORT_INTERVAL_MS: boundedNumberFromString(1000, 60000, "10000"),
    QUEUE_ENABLED: boolFromString.default("false"),
    QUEUE_REDIS_URL: z.string().url().default("redis://127.0.0.1:6379"),

    DEMO_MODE: boolFromString.default("false"),
    OPENAI_API_KEY: z.string().min(1),
    AI_DEFAULT_MODEL: z.string().min(1).default("gpt-4o-mini"),
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
  });

// Validate once at startup (server-only file)
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(
    "Invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Invalid environment variables. Check your .env");
}

export const env = parsed.data;

// Helpful derived values
export const isProd = env.NODE_ENV === "production";
