import type { Organization } from "@prisma/client";
import { prisma, type DbTx } from "@db";

const db = (tx?: DbTx) => tx ?? prisma;

export class OrgsRepo {
  async create(name: string, tx?: DbTx): Promise<Organization> {
    return db(tx).organization.create({ data: { name } });
  }

  async findById(orgId: string, tx?: DbTx): Promise<Organization | null> {
    return db(tx).organization.findUnique({ where: { id: orgId } });
  }
}
