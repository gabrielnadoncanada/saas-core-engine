import "server-only";

import { prisma } from "@db";

import { requireUser } from "@/server/auth/require-user";

export type ProfileFormData = {
  email: string;
  pendingEmail: string | null;
  emailVerifiedAt: Date | null;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  phoneNumber: string;
};

export async function getProfileFormData(): Promise<ProfileFormData> {
  const sessionUser = await requireUser();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.userId },
    select: {
      email: true,
      pendingEmail: true,
      emailVerifiedAt: true,
      username: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      phoneNumber: true,
    },
  });

  return {
    email: user?.email ?? "",
    pendingEmail: user?.pendingEmail ?? null,
    emailVerifiedAt: user?.emailVerifiedAt ?? null,
    username: user?.username ?? "",
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    avatarUrl: user?.avatarUrl ?? "",
    phoneNumber: user?.phoneNumber ?? "",
  };
}
