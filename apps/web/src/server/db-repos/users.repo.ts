import { prisma, type DbTx } from "@db";

import type { User } from "@db";

const db = (tx?: DbTx) => tx ?? prisma;

export class UsersRepo {
  async findById(userId: string, tx?: DbTx): Promise<User | null> {
    return db(tx).user.findFirst({ where: { id: userId, deletedAt: null } });
  }

  async findByEmail(email: string, tx?: DbTx): Promise<User | null> {
    return db(tx).user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
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
    await db(tx).user.updateMany({
      where: { id: userId, deletedAt: null },
      data: { emailVerifiedAt: new Date() },
    });
  }

  async setPasswordHash(
    userId: string,
    passwordHash: string,
    tx?: DbTx,
  ): Promise<void> {
    await db(tx).user.updateMany({
      where: { id: userId, deletedAt: null },
      data: { passwordHash },
    });
  }

  async touchLastLogin(userId: string, tx?: DbTx): Promise<void> {
    await db(tx).user.updateMany({
      where: { id: userId, deletedAt: null },
      data: { lastLoginAt: new Date() },
    });
  }

  async setActiveOrganization(
    userId: string,
    organizationId: string,
    tx?: DbTx,
  ): Promise<void> {
    await db(tx).user.updateMany({
      where: { id: userId, deletedAt: null },
      data: { activeOrganizationId: organizationId },
    });
  }

  async findActiveOrganizationId(
    userId: string,
    tx?: DbTx,
  ): Promise<string | null> {
    const user = await db(tx).user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { activeOrganizationId: true },
    });
    return user?.activeOrganizationId ?? null;
  }

  async softDelete(userId: string, tx?: DbTx): Promise<void> {
    await db(tx).user.updateMany({
      where: { id: userId, deletedAt: null },
      data: {
        deletedAt: new Date(),
        activeOrganizationId: null,
      },
    });
  }
}
