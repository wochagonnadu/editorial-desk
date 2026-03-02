// PATH: services/api/src/routes/drafts/pipeline-review.ts
// WHAT: Handlers for factcheck and revision streaming steps
// WHY:  Moves draft from generated text to review-ready state
// RELEVANT: services/api/src/core/factcheck.ts,services/api/src/core/drafts.ts

import { and, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { createVersion, transitionDraftStatus } from '../../core/drafts.js';
import {
  buildReport,
  extractClaims,
  flagDangerousAdvice,
  rejectUnSourcedStats,
  verifyHighRiskClaims,
} from '../../core/factcheck.js';
import { AppError } from '../../core/errors.js';
import {
  DrizzleDraftStore,
  claimTable,
  draftTable,
  draftVersionTable,
  expertTable,
  factcheckReportTable,
} from '../../providers/db/index.js';
import { getAuthUser } from '../auth-middleware.js';
import type { RouteDeps } from '../deps.js';
import { sseResponse } from './sse.js';

export const factcheckDraft = (deps: RouteDeps) => async (context: Context) => {
  const authUser = getAuthUser(context);
  const draftId = context.req.param('id');
  const [draft] = await deps.db
    .select()
    .from(draftTable)
    .where(and(eq(draftTable.id, draftId), eq(draftTable.companyId, authUser.companyId)))
    .limit(1);
  if (!draft || !draft.currentVersionId)
    throw new AppError(400, 'INVALID_STATE', 'Draft has no current version');

  const [existingReport] = await deps.db
    .select()
    .from(factcheckReportTable)
    .where(eq(factcheckReportTable.draftVersionId, draft.currentVersionId))
    .limit(1);
  if (existingReport) {
    const stream = async function* () {
      yield {
        type: 'done',
        report_id: existingReport.id,
        overall_risk_score: existingReport.overallRiskScore,
        disclaimer_type: existingReport.disclaimerType,
      };
    };
    return sseResponse(stream());
  }

  const [version] = await deps.db
    .select()
    .from(draftVersionTable)
    .where(eq(draftVersionTable.id, draft.currentVersionId))
    .limit(1);
  const [expert] = await deps.db
    .select()
    .from(expertTable)
    .where(eq(expertTable.id, draft.expertId))
    .limit(1);
  if (!version || !expert) throw new AppError(404, 'NOT_FOUND', 'Draft version not found');

  const stream = async function* () {
    const claims = await extractClaims(version.content, deps.content);
    if (flagDangerousAdvice(claims).length > 0)
      throw new AppError(422, 'DANGEROUS_CLAIMS', 'Draft contains dangerous claims');
    const verdicts = await verifyHighRiskClaims(claims, deps.content);
    const report = buildReport(version.id, claims, verdicts, expert.domain);
    const unsourced = rejectUnSourcedStats(claims);
    for (const claim of claims)
      yield { type: 'claim', text: claim.text, risk_level: claim.riskLevel };

    const insertedClaims = await deps.db
      .insert(claimTable)
      .values(
        claims.map((claim) => ({
          draftVersionId: version.id,
          text: claim.text,
          claimType: claim.claimType,
          riskLevel: claim.riskLevel,
        })) as Array<typeof claimTable.$inferInsert>,
      )
      .returning();
    const [insertedReport] = await deps.db
      .insert(factcheckReportTable)
      .values({
        draftVersionId: version.id,
        status: unsourced.length > 0 ? 'failed' : 'completed',
        results: report.results.map((item, index) => ({
          ...item,
          claim_id: insertedClaims[index]?.id,
        })),
        overallRiskScore: report.overallRiskScore.toFixed(2),
        disclaimerType: report.disclaimerType,
        completedAt: new Date(),
      } as unknown as typeof factcheckReportTable.$inferInsert)
      .returning();

    await transitionDraftStatus(
      deps.db,
      draft.id,
      unsourced.length > 0 ? 'revisions' : 'needs_review',
    );
    yield {
      type: 'done',
      report_id: insertedReport.id,
      overall_risk_score: insertedReport.overallRiskScore,
      disclaimer_type: insertedReport.disclaimerType,
    };
  };

  return sseResponse(stream());
};

export const reviseDraft = (deps: RouteDeps) => async (context: Context) => {
  const authUser = getAuthUser(context);
  const draftId = context.req.param('id');
  const body = (await context.req.json().catch(() => ({}))) as Record<string, unknown>;
  const instructions = typeof body.instructions === 'string' ? body.instructions.trim() : '';
  if (!instructions) throw new AppError(400, 'VALIDATION_ERROR', 'instructions are required');

  const [draft] = await deps.db
    .select()
    .from(draftTable)
    .where(and(eq(draftTable.id, draftId), eq(draftTable.companyId, authUser.companyId)))
    .limit(1);
  if (!draft || !draft.currentVersionId) throw new AppError(404, 'NOT_FOUND', 'Draft not found');
  const [current] = await deps.db
    .select()
    .from(draftVersionTable)
    .where(eq(draftVersionTable.id, draft.currentVersionId))
    .limit(1);
  if (!current) throw new AppError(404, 'NOT_FOUND', 'Current version not found');

  const stream = async function* () {
    const prompt = `Revise draft based on instructions.\nInstructions: ${instructions}\n\nDraft:\n${current.content}`;
    const chunks: string[] = [];
    for await (const chunk of await deps.content.streamText({
      model: process.env.OPENROUTER_REVISE_MODEL ?? 'openai/gpt-4o-mini',
      prompt,
    })) {
      chunks.push(chunk);
      yield { type: 'chunk', text: chunk };
    }
    const content = chunks.join('').trim() || current.content;
    const version = await createVersion(
      new DrizzleDraftStore(deps.db),
      draft.id,
      content,
      content.slice(0, 180),
      0.82,
      'revision',
    );
    await transitionDraftStatus(deps.db, draft.id, 'drafting');
    yield {
      type: 'done',
      version_id: version.id,
      version_number: version.versionNumber,
      voice_score: version.voiceScore,
    };
  };

  return sseResponse(stream());
};
