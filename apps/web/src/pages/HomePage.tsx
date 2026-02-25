// PATH: apps/web/src/pages/HomePage.tsx
// WHAT: Главный дашборд редакции: 5 блоков с приоритетами и активностью
// WHY:  US1 MVP — менеджер за один взгляд видит что требует внимания
// RELEVANT: apps/web/src/services/editorial-api.ts,apps/web/src/components/home/TodayActions.tsx

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardData, TodayAction } from '@newsroom/shared';
import { useAuth } from '../context/AuthContext';
import { editorialApi } from '../services/editorial-api';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ActivityFeed } from '../components/home/ActivityFeed';
import { InReviewList } from '../components/home/InReviewList';
import { MiniCalendar } from '../components/home/MiniCalendar';
import { TeamPulse } from '../components/home/TeamPulse';
import { TodayActions } from '../components/home/TodayActions';

const emptyData: DashboardData = {
  todayActions: [],
  inReview: [],
  weekSchedule: [],
  teamPulse: [],
  activityFeed: [],
};

export const HomePage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>(emptyData);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    editorialApi
      .getDashboard(token)
      .then((next) => setData(next))
      .catch(() => setData(emptyData))
      .finally(() => setLoading(false));
  }, [token]);

  const isFreshAccount = useMemo(
    () =>
      !data.todayActions.length &&
      !data.inReview.length &&
      !data.weekSchedule.length &&
      !data.teamPulse.length,
    [data],
  );

  const onOpenAction = (targetType: TodayAction['targetType'], targetId: string) => {
    if (targetType === 'draft') return navigate(`/drafts/${targetId}`);
    if (targetType === 'approval_step') return navigate('/approvals');
    return navigate('/drafts');
  };

  if (loading) {
    return (
      <section className="home-grid">
        {Array.from({ length: 5 }).map((_, index) => (
          <article className="card" key={index}>
            <Skeleton variant="list" />
          </article>
        ))}
      </section>
    );
  }

  return (
    <section style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <h1>Home</h1>
      {isFreshAccount ? (
        <div className="home-grid">
          <EmptyState
            message="Add your first expert"
            action={{ label: 'Open Experts', onClick: () => navigate('/experts') }}
          />
          <EmptyState
            message="Create your first weekly plan"
            action={{ label: 'Open Calendar', onClick: () => navigate('/calendar') }}
          />
        </div>
      ) : null}
      <div className="home-grid">
        <TodayActions actions={data.todayActions} onOpen={onOpenAction} />
        <InReviewList items={data.inReview} onOpenDraft={(id) => navigate(`/drafts/${id}`)} />
        <MiniCalendar items={data.weekSchedule} />
        <TeamPulse items={data.teamPulse} />
        <ActivityFeed items={data.activityFeed} />
      </div>
    </section>
  );
};
