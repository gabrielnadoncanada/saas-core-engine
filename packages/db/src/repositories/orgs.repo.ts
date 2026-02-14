import type { Organization } from "@prisma/client";
import { getDb, type DbTx } from "../tx";

export class OrgsRepo {
  async create(name: string, tx?: DbTx): Promise<Organization> {
    return getDb(tx).organization.create({ data: { name } });
  }

  async findById(orgId: string, tx?: DbTx): Promise<Organization | null> {
    return getDb(tx).organization.findUnique({ where: { id: orgId } });
  }
}
