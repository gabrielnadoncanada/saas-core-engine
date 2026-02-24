import * as z from "zod";

export const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Email format is invalid")
    .max(320, "Email must be at most 320 characters."),
  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password must be at most 128 characters."),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const forgotPasswordFormSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Email format is invalid")
    .max(320, "Email must be at most 320 characters."),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordFormSchema>;

export const resetPasswordFormSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be at most 128 characters."),
});

export type ResetPasswordValues = z.infer<typeof resetPasswordFormSchema>;

export const DEMO_CREDENTIALS = {
  email: "demo@saastemplate.dev",
  password: "DemoPassw0rd!",
} as const;
