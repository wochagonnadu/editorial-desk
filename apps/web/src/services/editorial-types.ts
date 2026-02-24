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
  comments: Array<{ id: string; text: string; createdAt: string }>;
}

export interface PipelineEvent {
  type: string;
  [key: string]: unknown;
}
