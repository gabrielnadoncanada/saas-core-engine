"use server";

import { getSessionUser } from "@/server/auth/require-user";
import { type ActionResult, ok } from "@/shared/types/action-result";

export async function getMeAction(): Promise<
  ActionResult<{ userId: string; organizationId: string } | null>
> {
  const user = await getSessionUser();
  if (!user) return ok(null);
  return ok({ userId: user.userId, organizationId: user.organizationId });
}
