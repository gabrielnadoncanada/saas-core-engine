import * as z from "zod";

export const baseSignupSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Email format is invalid")
    .max(320, "Email must be at most 320 characters."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be at most 128 characters."),
});

export const signupFormSchema = baseSignupSchema.extend({
  orgName: z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters.")
    .max(120, "Workspace name must be at most 120 characters."),
});

export const inviteSignupSchema = baseSignupSchema;

export type InviteLookupState = "idle" | "loading" | "ready" | "error";

export type SignupFormState = {
  error: string | null;
};
