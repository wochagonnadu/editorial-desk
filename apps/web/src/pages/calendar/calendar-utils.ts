// PATH: apps/web/src/pages/calendar/calendar-utils.ts
// WHAT: Mapping and filtering helpers for CalendarPage
// WHY:  Keeps calendar page focused on UI orchestration
// RELEVANT: apps/web/src/pages/CalendarPage.tsx,apps/web/src/components/calendar/types.ts

import type { DraftCard } from '../../services/editorial-types';
import type { CalendarEntry, CalendarRisk } from '../../components/calendar/types';

export const toRisk = (factcheckStatus: string): CalendarRisk => {
  if (factcheckStatus === 'failed') return 'high';
  if (factcheckStatus === 'pending') return 'medium';
  return 'low';
};

export const toCalendarEntries = (drafts: DraftCard[]): CalendarEntry[] =>
  drafts.map((draft) => ({
    draftId: draft.id,
    title: draft.topic?.title ?? 'Untitled',
    expertId: draft.expert?.id ?? 'unknown',
    expertName: draft.expert?.name ?? 'Unknown',
    status: draft.status,
    scheduledDate: draft.updated_at.slice(0, 10),
    risk: toRisk(draft.factcheck_status),
  }));

export const startOfWeek = (date: Date): string => {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = (copy.getUTCDay() + 6) % 7;
  copy.setUTCDate(copy.getUTCDate() - day);
  return copy.toISOString().slice(0, 10);
};

export const monthKey = (date: Date): string => date.toISOString().slice(0, 7);

export const filterEntries = (
  entries: CalendarEntry[],
  filters: { expertId: string; status: string; risk: '' | CalendarRisk },
): CalendarEntry[] =>
  entries.filter((item) => {
    if (filters.expertId && item.expertId !== filters.expertId) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.risk && item.risk !== filters.risk) return false;
    return true;
  });
