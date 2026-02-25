import * as z from "zod";

export const resetPasswordFormSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be at most 128 characters."),
});

export type ResetPasswordValues = z.infer<typeof resetPasswordFormSchema>;
