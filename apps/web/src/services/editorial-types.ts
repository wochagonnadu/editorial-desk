// PATH: apps/web/src/services/editorial-types.ts
// WHAT: Shared frontend types for topics and draft lifecycle screens
// WHY:  Keeps page components and API helpers aligned on payload shape
// RELEVANT: apps/web/src/services/editorial-api.ts,apps/web/src/pages/DraftsPage.tsx

export interface TopicItem {
  id: string;
  title: string;
  description?: string;
  source_type: string;
  status: string;
  created_at?: string;
  expert?: { id: string; name: string } | null;
}

export interface DraftCard {
  id: string;
  status: string;
  updated_at: string;
  current_version: number | null;
  voice_score: number | null;
  factcheck_status: string;
  topic?: { id: string; title: string } | null;
  expert?: { id: string; name: string } | null;
}

export interface DraftDetail {
  id: string;
  status: string;
  topic?: { id: string; title: string } | null;
  expert?: { id: string; name: string } | null;
  current_version?: {
    id: string;
    versionNumber: number;
    content: string;
    summary?: string;
    voiceScore?: string | number;
  } | null;
  factcheck_report?: { status: string; results: Array<Record<string, unknown>> } | null;
  approval?: ApprovalStatusData | null;
  comments: Array<{ id: string; text: string; createdAt: string }>;
}

export interface ApprovalStepView {
  step_order: number;
  status: 'waiting' | 'pending' | 'approved' | 'changes_requested';
  deadline_at?: string | null;
  approver?: { name: string; email?: string | null };
}

export interface ApprovalStatusData {
  flow_type: 'sequential' | 'parallel';
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  steps: ApprovalStepView[];
}

export interface ApprovalConfigPayload {
  flow_type: 'sequential' | 'parallel';
  deadline_hours: number;
  steps: Array<{ approver_type: 'user' | 'expert'; approver_id: string }>;
}

export interface PipelineEvent {
  type: string;
  [key: string]: unknown;
}

export interface DraftVersionItem {
  id: string;
  content?: string;
  versionNumber?: number;
  version_number?: number;
  createdAt?: string;
  created_at?: string;
  voiceScore?: string | number | null;
  voice_score?: string | number | null;
  diffFromPrevious?: Record<string, unknown> | null;
  diff_from_previous?: Record<string, unknown> | null;
}

export interface AuditEntry {
  id: string;
  actor: { type: string; id?: string | null; name: string };
  action: string;
  entity_type: string;
  entity_id: string;
  draft_version_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface MonthlyReport {
  period: string;
  drafts_created: number;
  drafts_approved: number;
  drafts_pending: number;
  avg_approval_days: number;
  delays: Array<{ expert: string; draft_title: string; days_delayed: number }>;
}
