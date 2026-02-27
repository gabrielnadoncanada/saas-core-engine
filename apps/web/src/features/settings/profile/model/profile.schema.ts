import * as z from "zod";

export const profileFormSchema = z.object({
  username: z
    .string()
    .trim()
    .max(32, "Username must be at most 32 characters.")
    .regex(/^[a-z0-9._]*$/, "Username can only include lowercase letters, numbers, dots, and underscores."),
  firstName: z.string().trim().max(80, "First name must be at most 80 characters."),
  lastName: z.string().trim().max(80, "Last name must be at most 80 characters."),
  phoneNumber: z
    .string()
    .trim()
    .max(32, "Phone number must be at most 32 characters.")
    .regex(/^[0-9+\-().\s]{0,32}$/, "Phone number format is invalid."),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
