import * as z from "zod";

export const INVITED_WORKSPACE_NAME = "Invited workspace";

export const signupDefaultValues = {
  orgName: "",
  email: "",
  password: "",
} as const;

export const signupFormSchema = z.object({
  orgName: z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters.")
    .max(120, "Workspace name must be at most 120 characters."),
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

export type SignupFormValues = z.infer<typeof signupFormSchema>;

export type InviteLookupState = "idle" | "loading" | "ready" | "error";
