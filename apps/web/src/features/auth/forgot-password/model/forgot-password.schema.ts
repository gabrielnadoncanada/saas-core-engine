import * as z from "zod";

export const forgotPasswordFormSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Email format is invalid")
    .max(320, "Email must be at most 320 characters."),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordFormSchema>;
