"use server";

import { Prisma, prisma } from "@db";
import { randomUUID } from "crypto";
import { access, mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

import { authErrorMessage } from "@/server/auth/auth-error-message";
import { requireUser } from "@/server/auth/require-user";
import type { ProfileFormState } from "../model/profile-form-state";
import { profileFormSchema } from "../model/profile.schema";

const INVALID_INPUT_MESSAGE = "Invalid input.";
const UPDATE_FAILED_MESSAGE = "Failed to update profile.";
const UPDATE_SUCCESS_MESSAGE = "Profile updated.";
const MAX_AVATAR_FILE_SIZE = 3 * 1024 * 1024;

const ALLOWED_AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function saveAvatarFile(file: File): Promise<string> {
  const extension = ALLOWED_AVATAR_TYPES[file.type];
  if (!extension) {
    throw new Error("invalid_avatar_type");
  }
  if (file.size > MAX_AVATAR_FILE_SIZE) {
    throw new Error("invalid_avatar_size");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = `${randomUUID()}.${extension}`;
  const uploadsDir = path.join(await resolvePublicDir(), "uploads", "avatars");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), bytes);
  return `/uploads/avatars/${filename}`;
}

async function resolvePublicDir(): Promise<string> {
  const directPublic = path.join(process.cwd(), "public");
  try {
    await access(directPublic);
    return directPublic;
  } catch {
    return path.join(process.cwd(), "apps", "web", "public");
  }
}

async function removeStoredAvatarIfLocal(avatarUrl: string | null | undefined) {
  if (!avatarUrl || !avatarUrl.startsWith("/uploads/avatars/")) return;
  const filePath = path.join(await resolvePublicDir(), avatarUrl);
  try {
    await unlink(filePath);
  } catch {
    // best-effort cleanup only
  }
}

export async function updateProfileAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const validated = profileFormSchema.safeParse({
    username: String(formData.get("username") ?? "").trim().toLowerCase(),
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    phoneNumber: String(formData.get("phoneNumber") ?? ""),
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
    const avatarFile = formData.get("avatarFile");
    const nextAvatarFile = avatarFile instanceof File && avatarFile.size > 0 ? avatarFile : null;

    let nextAvatarUrl: string | null | undefined;
    if (nextAvatarFile) {
      nextAvatarUrl = await saveAvatarFile(nextAvatarFile);
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
      select: { avatarUrl: true },
    });

    const normalized = {
      username: validated.data.username || null,
      firstName: validated.data.firstName.trim() || null,
      lastName: validated.data.lastName.trim() || null,
      avatarUrl: nextAvatarUrl ?? currentUser?.avatarUrl ?? null,
      phoneNumber: validated.data.phoneNumber.trim() || null,
    };

    const updated = await prisma.user.updateMany({
      where: { id: sessionUser.userId, deletedAt: null },
      data: normalized,
    });

    if (updated.count === 0) {
      return { error: UPDATE_FAILED_MESSAGE, success: null };
    }

    if (nextAvatarUrl && currentUser?.avatarUrl && currentUser.avatarUrl !== nextAvatarUrl) {
      await removeStoredAvatarIfLocal(currentUser.avatarUrl);
    }

    return {
      error: null,
      success: UPDATE_SUCCESS_MESSAGE,
      fieldErrors: {},
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        error: "Username is already in use.",
        success: null,
        fieldErrors: { username: ["Username is already in use."] },
      };
    }
    if (error instanceof Error && error.message === "invalid_avatar_type") {
      return {
        error: "Avatar must be a JPG, PNG, or WEBP image.",
        success: null,
        fieldErrors: { avatarFile: ["Avatar must be a JPG, PNG, or WEBP image."] },
      };
    }
    if (error instanceof Error && error.message === "invalid_avatar_size") {
      return {
        error: "Avatar must be 3MB or smaller.",
        success: null,
        fieldErrors: { avatarFile: ["Avatar must be 3MB or smaller."] },
      };
    }
    return {
      error: authErrorMessage(error, UPDATE_FAILED_MESSAGE),
      success: null,
    };
  }
}
