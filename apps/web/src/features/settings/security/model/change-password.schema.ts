import * as z from "zod";

const PASSWORD_BLACKLIST = ["password", "123456", "qwerty", "letmein", "admin"];

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password must be at most 128 characters.")
      .regex(/[a-z]/, "Password must include at least one lowercase letter.")
      .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
      .regex(/\d/, "Password must include at least one number.")
      .regex(/[^A-Za-z0-9]/, "Password must include at least one special character.")
      .refine((value) => !/\s/.test(value), "Password must not contain spaces."),
    confirmPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "New password must be different from current password.",
    path: ["newPassword"],
  })
  .refine((value) => {
    const lowered = value.newPassword.toLowerCase();
    return !PASSWORD_BLACKLIST.some((item) => lowered.includes(item));
  }, {
    message: "Password is too weak.",
    path: ["newPassword"],
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
