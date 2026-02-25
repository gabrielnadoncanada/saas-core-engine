import * as z from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be at most 128 characters.")
  .regex(/[a-z]/, "Password must include at least one lowercase letter.")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
  .regex(/\d/, "Password must include at least one number.")
  .regex(/[^A-Za-z0-9]/, "Password must include at least one special character.")
  .refine((value) => !/\s/.test(value), "Password must not contain spaces.");

const baseSignupObjectSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Email format is invalid")
    .max(320, "Email must be at most 320 characters.")
    .transform((value) => value.toLowerCase()),
  password: passwordSchema,
  passwordConfirm: z.string(),
});

function ensurePasswordsMatch(
  data: { password: string; passwordConfirm: string },
  ctx: z.RefinementCtx,
) {
  const { password, passwordConfirm } = data;
  if (password !== passwordConfirm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["passwordConfirm"],
      message: "Passwords do not match.",
    });
  }
}

export const baseSignupSchema = baseSignupObjectSchema.superRefine(ensurePasswordsMatch);

export const signupFormSchema = baseSignupObjectSchema
  .extend({
    orgName: z
      .string()
      .trim()
      .min(2, "Workspace name must be at least 2 characters.")
      .max(120, "Workspace name must be at most 120 characters."),
  })
  .superRefine(ensurePasswordsMatch);

export const inviteSignupSchema = baseSignupSchema;

export type InviteLookupState = "idle" | "loading" | "ready" | "error";
