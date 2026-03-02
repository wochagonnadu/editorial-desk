// PATH: services/api/src/providers/db/draft-store.ts
// WHAT: Drizzle implementation of DraftStore port
// WHY:  Encapsulates draft CRUD and immutable version persistence
// RELEVANT: packages/shared/src/ports/draft-store.ts,services/api/src/providers/db/schema.ts

import { and, desc, eq } from 'drizzle-orm';
import type { Draft, DraftStore, DraftVersion } from '@newsroom/shared';
import type { Database } from './pool.js';
import { draftTable, draftVersionTable } from './schema.js';

const toDraft = (row: typeof draftTable.$inferSelect): Draft => ({
  id: row.id,
  topicId: row.topicId,
  expertId: row.expertId,
  companyId: row.companyId,
  currentVersionId: row.currentVersionId ?? undefined,
  status: row.status as Draft['status'],
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const toDraftVersion = (row: typeof draftVersionTable.$inferSelect): DraftVersion => ({
  id: row.id,
  draftId: row.draftId,
  versionNumber: row.versionNumber,
  content: row.content,
  summary: row.summary ?? undefined,
  voiceScore: row.voiceScore ? Number(row.voiceScore) : undefined,
  diffFromPrevious: (row.diffFromPrevious as Record<string, unknown>) ?? undefined,
  createdBy: row.createdBy as DraftVersion['createdBy'],
  createdAt: row.createdAt.toISOString(),
});

export class DrizzleDraftStore implements DraftStore {
  constructor(private readonly db: Database) {}

  async create(input: Parameters<DraftStore['create']>[0]): Promise<Draft> {
    const [row] = await this.db.insert(draftTable).values(input).returning();
    return toDraft(row);
  }

  async findById(id: string, companyId: string): Promise<Draft | null> {
    const [row] = await this.db
      .select()
      .from(draftTable)
      .where(and(eq(draftTable.id, id), eq(draftTable.companyId, companyId)))
      .limit(1);
    return row ? toDraft(row) : null;
  }

  async list(filter: Parameters<DraftStore['list']>[0]): Promise<Draft[]> {
    const predicates = [eq(draftTable.companyId, filter.companyId)];
    if (filter.status) predicates.push(eq(draftTable.status, filter.status));
    if (filter.expertId) predicates.push(eq(draftTable.expertId, filter.expertId));
    const rows = await this.db
      .select()
      .from(draftTable)
      .where(and(...predicates));
    return rows.map(toDraft);
  }

  async createVersion(input: Parameters<DraftStore['createVersion']>[0]): Promise<DraftVersion> {
    const [latest] = await this.db
      .select()
      .from(draftVersionTable)
      .where(eq(draftVersionTable.draftId, input.draftId))
      .orderBy(desc(draftVersionTable.versionNumber))
      .limit(1);
    const nextVersion = (latest?.versionNumber ?? 0) + 1;
    const [row] = await this.db
      .insert(draftVersionTable)
      .values({
        ...input,
        versionNumber: nextVersion,
        voiceScore: input.voiceScore === undefined ? undefined : input.voiceScore.toFixed(2),
      } as unknown as typeof draftVersionTable.$inferInsert)
      .returning();
    await this.db
      .update(draftTable)
      .set({ currentVersionId: row.id, updatedAt: new Date() } as Partial<
        typeof draftTable.$inferInsert
      >)
      .where(eq(draftTable.id, input.draftId));
    return toDraftVersion(row);
  }

  async listVersions(draftId: string): Promise<DraftVersion[]> {
    const rows = await this.db
      .select()
      .from(draftVersionTable)
      .where(eq(draftVersionTable.draftId, draftId))
      .orderBy(desc(draftVersionTable.versionNumber));
    return rows.map(toDraftVersion);
  }
}
