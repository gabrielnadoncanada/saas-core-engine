import * as z from "zod";

export const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Email format is invalid")
    .max(320, "Email must be at most 320 characters.")
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password must be at most 128 characters."),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const DEMO_CREDENTIALS = {
  email: "demo@saastemplate.dev",
  password: "DemoPassw0rd!",
} as const;
