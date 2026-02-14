import type { User } from "@prisma/client";
import { getDb, type DbTx } from "../tx";

export class UsersRepo {
  async findById(userId: string, tx?: DbTx): Promise<User | null> {
    return getDb(tx).user.findUnique({ where: { id: userId } });
  }

  async findByEmail(email: string, tx?: DbTx): Promise<User | null> {
    return getDb(tx).user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async create(
    params: { email: string; passwordHash?: string | null },
    tx?: DbTx,
  ): Promise<User> {
    return getDb(tx).user.create({
      data: {
        email: params.email.toLowerCase(),
        passwordHash: params.passwordHash ?? null,
      },
    });
  }

  async markEmailVerified(userId: string, tx?: DbTx): Promise<void> {
    await getDb(tx).user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  async setPasswordHash(
    userId: string,
    passwordHash: string,
    tx?: DbTx,
  ): Promise<void> {
    await getDb(tx).user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async touchLastLogin(userId: string, tx?: DbTx): Promise<void> {
    await getDb(tx).user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}
