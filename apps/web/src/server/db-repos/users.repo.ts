import type { User } from "@prisma/client";
import { prisma, type DbTx } from "@db";

const db = (tx?: DbTx) => tx ?? prisma;

export class UsersRepo {
  async findById(userId: string, tx?: DbTx): Promise<User | null> {
    return db(tx).user.findUnique({ where: { id: userId } });
  }

  async findByEmail(email: string, tx?: DbTx): Promise<User | null> {
    return db(tx).user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async create(
    params: { email: string; passwordHash?: string | null },
    tx?: DbTx,
  ): Promise<User> {
    return db(tx).user.create({
      data: {
        email: params.email.toLowerCase(),
        passwordHash: params.passwordHash ?? null,
      },
    });
  }

  async markEmailVerified(userId: string, tx?: DbTx): Promise<void> {
    await db(tx).user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  async setPasswordHash(
    userId: string,
    passwordHash: string,
    tx?: DbTx,
  ): Promise<void> {
    await db(tx).user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async touchLastLogin(userId: string, tx?: DbTx): Promise<void> {
    await db(tx).user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async setActiveOrganization(
    userId: string,
    organizationId: string,
    tx?: DbTx,
  ): Promise<void> {
    await db(tx).user.update({
      where: { id: userId },
      data: { activeOrganizationId: organizationId },
    });
  }

  async findActiveOrganizationId(
    userId: string,
    tx?: DbTx,
  ): Promise<string | null> {
    const user = await db(tx).user.findUnique({
      where: { id: userId },
      select: { activeOrganizationId: true },
    });
    return user?.activeOrganizationId ?? null;
  }
}
