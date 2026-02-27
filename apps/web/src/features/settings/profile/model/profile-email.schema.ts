import * as z from "zod";

export const profileEmailSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(320, "Enter a valid email address."),
});

export type ProfileEmailValues = z.infer<typeof profileEmailSchema>;
