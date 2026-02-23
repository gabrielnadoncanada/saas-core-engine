import type { Prisma, PrismaClient } from "./generated/prisma/client";
import { prisma } from "./client";

export type DbTx = Prisma.TransactionClient;

export async function withTx<T>(
  fn: (tx: DbTx) => Promise<T>,
): Promise<T> {
  return prisma.$transaction((tx) => fn(tx));
}

export function getDb(tx?: DbTx): PrismaClient | DbTx {
  return tx ?? prisma;
}
