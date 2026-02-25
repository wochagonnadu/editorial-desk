// PATH: packages/shared/src/types/dashboard.ts
// WHAT: Типы для дашборда и списка approval
// WHY:  FR-010–014, FR-040–041 — типизация данных Home и Approvals
// RELEVANT: packages/shared/src/types/topic-draft.ts, services/api/src/routes/dashboard.ts

import type { EntityId, ISODateTime } from './common';
import type { DraftStatus } from './topic-draft';

/** Одно приоритетное действие на Today's Actions */
export interface TodayAction {
  id: EntityId;
  type: 'approve_topics' | 'draft_ready' | 'facts_to_confirm' | 'reminder_needed';
  label: string;
  targetId: EntityId;
  targetType: 'draft' | 'topic' | 'approval_step';
}

/** Драфт в статусе Needs Review для In Review блока */
export interface InReviewItem {
  draftId: EntityId;
  title: string;
  status: DraftStatus;
  reviewer: string;
  /** Время в статусе Needs Review, секунды */
  timeInStatusSec: number;
  deadline?: ISODateTime;
}

/** Эксперт в Team Pulse */
export interface TeamPulseItem {
  expertId: EntityId;
  name: string;
  voiceReadiness: number;
  lastResponseAt?: ISODateTime;
  draftsInProgress: number;
}

/** Событие для Activity Feed */
export interface ActivityEvent {
  id: EntityId;
  actor: string;
  action: string;
  target: string;
  createdAt: ISODateTime;
}

/** Полный ответ GET /dashboard */
export interface DashboardData {
  todayActions: TodayAction[];
  inReview: InReviewItem[];
  weekSchedule: WeekScheduleItem[];
  teamPulse: TeamPulseItem[];
  activityFeed: ActivityEvent[];
}

/** Элемент недельного расписания */
export interface WeekScheduleItem {
  draftId: EntityId;
  title: string;
  expertName: string;
  status: DraftStatus;
  scheduledDate: string; // YYYY-MM-DD
}

/** Элемент списка approval для Approvals page */
export interface ApprovalListItem {
  stepId: EntityId;
  draftId: EntityId;
  draftTitle: string;
  reviewer: string;
  status: string;
  timeWaitingSec: number;
  deadline?: ISODateTime;
}
