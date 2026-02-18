import type { UsersRepo } from "../auth.ports";
import { authErr, isUniqueConstraintViolation } from "../errors";

export async function createUserOrThrowEmailInUse(
  users: UsersRepo,
  params: { email: string; passwordHash: string | null },
  tx?: any,
) {
  try {
    return await users.create(params, tx);
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      throw authErr("email_in_use", "Email already in use");
    }
    throw error;
  }
}

export async function createUserOrFindByEmailOnUnique(
  users: UsersRepo,
  params: { email: string; passwordHash: string | null },
  tx?: any,
) {
  try {
    return await users.create(params, tx);
  } catch (error) {
    if (!isUniqueConstraintViolation(error)) throw error;
    const existing = await users.findByEmail(params.email, tx);
    if (!existing) throw error;
    return existing;
  }
}
