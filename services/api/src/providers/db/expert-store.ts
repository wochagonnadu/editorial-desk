// PATH: services/api/src/providers/db/expert-store.ts
// WHAT: Drizzle implementation of ExpertStore port
// WHY:  Provides expert CRUD without leaking ORM details to core
// RELEVANT: packages/shared/src/ports/expert-store.ts,services/api/src/providers/db/schema.ts

import { and, eq } from 'drizzle-orm';
import type { ExpertStore } from '@newsroom/shared';
import type { Expert } from '@newsroom/shared';
import type { Database } from './pool';
import { expertTable } from './schema';

const toExpert = (row: typeof expertTable.$inferSelect): Expert => ({
  id: row.id,
  companyId: row.companyId,
  name: row.name,
  roleTitle: row.roleTitle,
  email: row.email,
  domain: row.domain as Expert['domain'],
  publicTextUrls: (row.publicTextUrls as string[]) ?? [],
  status: row.status as Expert['status'],
  createdAt: row.createdAt.toISOString(),
});

export class DrizzleExpertStore implements ExpertStore {
  constructor(private readonly db: Database) {}

  async create(input: Parameters<ExpertStore['create']>[0]): Promise<Expert> {
    const [row] = await this.db
      .insert(expertTable)
      .values({
        companyId: input.companyId,
        name: input.name,
        roleTitle: input.roleTitle,
        email: input.email,
        domain: input.domain,
        publicTextUrls: input.publicTextUrls ?? [],
        status: input.status ?? 'pending',
      } as unknown as typeof expertTable.$inferInsert)
      .returning();

    return toExpert(row);
  }

  async findById(id: string, companyId: string): Promise<Expert | null> {
    const [row] = await this.db
      .select()
      .from(expertTable)
      .where(and(eq(expertTable.id, id), eq(expertTable.companyId, companyId)))
      .limit(1);

    return row ? toExpert(row) : null;
  }

  async list(filter: Parameters<ExpertStore['list']>[0]): Promise<Expert[]> {
    const predicates = [eq(expertTable.companyId, filter.companyId)];
    if (filter.status) {
      predicates.push(eq(expertTable.status, filter.status));
    }

    const rows = await this.db
      .select()
      .from(expertTable)
      .where(and(...predicates));
    return rows.map(toExpert);
  }
}
