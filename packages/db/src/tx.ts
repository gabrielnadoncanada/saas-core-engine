import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./client";

export type DbTx = Prisma.TransactionClient;

export async function withTx<T>(
  fn: (tx: DbTx) => Promise<T>,
  options?: Prisma.TransactionOptions,
): Promise<T> {
  return prisma.$transaction((tx) => fn(tx), options);
}

export function getDb(tx?: DbTx): PrismaClient | DbTx {
  return tx ?? prisma;
}
