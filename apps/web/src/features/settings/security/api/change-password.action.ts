"use server";

import { hashPassword, verifyPassword } from "@auth-core";
import { prisma } from "@db";

import { authErrorMessage } from "@/server/auth/auth-error-message";
import { requireUser } from "@/server/auth/require-user";

import type { ChangePasswordFormState } from "../model/change-password.form-state";
import { changePasswordSchema } from "../model/change-password.schema";

const INVALID_INPUT_MESSAGE = "Invalid input.";
const CHANGE_PASSWORD_FAILED_MESSAGE = "Failed to change password.";
const PASSWORD_CHANGED_MESSAGE = "Password changed successfully.";

export async function changePasswordAction(
  _prevState: ChangePasswordFormState,
  formData: FormData,
): Promise<ChangePasswordFormState> {
  const validated = changePasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!validated.success) {
    const flattened = validated.error.flatten();
    return {
      error: validated.error.errors[0]?.message ?? INVALID_INPUT_MESSAGE,
      success: null,
      fieldErrors: flattened.fieldErrors,
    };
  }

  try {
    const sessionUser = await requireUser();
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
      select: { passwordHash: true },
    });

    if (!user) {
      return { error: "Unauthorized.", success: null };
    }

    if (!user.passwordHash) {
      return {
        error: "No password is currently set. Use Authentication page to set one first.",
        success: null,
      };
    }

    const validCurrentPassword = await verifyPassword(
      user.passwordHash,
      validated.data.currentPassword,
    );

    if (!validCurrentPassword) {
      return {
        error: "Current password is incorrect.",
        success: null,
        fieldErrors: { currentPassword: ["Current password is incorrect."] },
      };
    }

    const nextHash = await hashPassword(validated.data.newPassword);
    await prisma.user.update({
      where: { id: sessionUser.userId },
      data: { passwordHash: nextHash },
    });

    return {
      error: null,
      success: PASSWORD_CHANGED_MESSAGE,
      fieldErrors: {},
    };
  } catch (error) {
    return {
      error: authErrorMessage(error, CHANGE_PASSWORD_FAILED_MESSAGE),
      success: null,
    };
  }
}
