// PATH: apps/web/src/services/dashboard.ts
// WHAT: Dashboard API adapter with snake_case to camelCase mapping
// WHY:  Keeps Home page free from transport-level response details
// RELEVANT: apps/web/src/pages/Home.tsx,apps/web/src/services/api/client.ts

import { apiRequest } from './api/client';

export type DashboardAction = {
  id: string;
  label: string;
  status: string;
};

export type DashboardReviewItem = {
  draftId: string;
  title: string;
  status: string;
  reviewer: string;
  timeInStatusSec: number;
};

export type DashboardPulseItem = {
  expertId: string;
  name: string;
  voiceReadiness: number;
  draftsInProgress: number;
  lastResponseAt?: string;
};

export type DashboardWeekItem = {
  draftId: string;
  title: string;
  expertName: string;
  status: string;
  scheduledDate: string;
};

type DashboardResponse = {
  todayActions: Array<{ id: string; label: string; type: string }>;
  inReview: Array<{
    draftId: string;
    title: string;
    status: string;
    reviewer: string;
    timeInStatusSec: number;
  }>;
  teamPulse: Array<{
    expertId: string;
    name: string;
    voiceReadiness: number;
    draftsInProgress: number;
    lastResponseAt?: string;
  }>;
  weekSchedule: Array<{
    draftId: string;
    title: string;
    expertName: string;
    status: string;
    scheduledDate: string;
  }>;
};

export type DashboardData = {
  todayActions: DashboardAction[];
  inReview: DashboardReviewItem[];
  teamPulse: DashboardPulseItem[];
  weekSchedule: DashboardWeekItem[];
};

export const fetchDashboard = async (token: string): Promise<DashboardData> => {
  const data = await apiRequest<DashboardResponse>('/api/v1/dashboard', { token });
  return {
    todayActions: data.todayActions.map((item) => ({
      id: item.id,
      label: item.label,
      status: item.type,
    })),
    inReview: data.inReview,
    teamPulse: data.teamPulse,
    weekSchedule: data.weekSchedule,
  };
};
