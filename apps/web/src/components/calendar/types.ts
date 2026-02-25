// PATH: apps/web/src/components/calendar/types.ts
// WHAT: Shared UI type for calendar entries and filters
// WHY:  Single source of truth for week/month/filter components
// RELEVANT: apps/web/src/pages/CalendarPage.tsx,apps/web/src/components/calendar/WeekView.tsx

export type CalendarRisk = 'low' | 'medium' | 'high';

export interface CalendarEntry {
  draftId: string;
  title: string;
  expertId: string;
  expertName: string;
  status: string;
  scheduledDate: string; // YYYY-MM-DD
  risk: CalendarRisk;
}
