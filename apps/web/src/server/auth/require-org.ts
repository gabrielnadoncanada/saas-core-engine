import "server-only";

import { requireUser } from "@/server/auth/require-user";

export async function getActiveOrgIdForUser(): Promise<string | null> {
  const user = await requireUser();
  return user.organizationId;
}

export const getDefaultOrgIdForUser = getActiveOrgIdForUser;
