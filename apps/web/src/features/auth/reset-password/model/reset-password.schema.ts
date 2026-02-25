import * as z from "zod";

export const resetPasswordFormSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be at most 128 characters."),
  confirmPassword: z.string().min(1, "Please confirm your password."),
}).refine((values) => values.password === values.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export type ResetPasswordValues = z.infer<typeof resetPasswordFormSchema>;
