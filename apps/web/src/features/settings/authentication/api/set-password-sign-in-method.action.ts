"use server";

import { hashPassword } from "@auth-core";
import { prisma } from "@db";
import { z } from "zod";

import { authErrorMessage } from "@/server/auth/auth-error-message";
import { requireUser } from "@/server/auth/require-user";
import type { ActionResult } from "@/shared/types";
import { fail, ok } from "@/shared/types";
import { getCurrentSignInMethods } from "./get-current-sign-in-methods.query";
import type { SignInMethod } from "../model/sign-in-methods.types";

const PASSWORD_BLACKLIST = ["password", "123456", "qwerty", "letmein", "admin"];

const setPasswordSchema = z
  .object({
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Password confirmation does not match.",
    path: ["confirmPassword"],
  })
  .refine(
    (value) => {
      const lowered = value.password.toLowerCase();
      return !PASSWORD_BLACKLIST.some((item) => lowered.includes(item));
    },
    {
      message: "Password is too weak.",
      path: ["password"],
    },
  );

export async function setPasswordSignInMethodAction(input: {
  password: string;
  confirmPassword: string;
}): Promise<ActionResult<SignInMethod[]>> {
  try {
    const parsed = setPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.errors[0]?.message ?? "Invalid input.");
    }

    const sessionUser = await requireUser();
    const user = await prisma.user.findFirst({
      where: { id: sessionUser.userId, deletedAt: null },
      select: { passwordHash: true },
    });
    if (!user) {
      return fail("Unauthorized.");
    }
    if (user.passwordHash) {
      return fail("Password is already set for this account.");
    }

    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.user.update({
      where: { id: sessionUser.userId },
      data: { passwordHash },
    });

    const methods = await getCurrentSignInMethods();
    return ok(methods);
  } catch (error) {
    return fail(authErrorMessage(error, "Failed to set password."));
  }
}
