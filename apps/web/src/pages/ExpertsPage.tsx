// PATH: apps/web/src/pages/ExpertsPage.tsx
// WHAT: Experts grid with workload metrics and request action
// WHY:  FR-030/FR-032 — менеджер видит состояние экспертов и может отправить ping
// RELEVANT: apps/web/src/components/experts/ExpertCard.tsx,apps/web/src/services/api.ts

import { useEffect, useMemo, useState } from 'react';
import { AddExpertForm } from '../components/AddExpertForm';
import { ExpertCard } from '../components/experts/ExpertCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { apiClient, type ExpertListItem } from '../services/api';
import { editorialApi } from '../services/editorial-api';

type Pulse = { voiceReadiness: number; lastResponseAt?: string; draftsInProgress: number };

export const ExpertsPage = () => {
  const { token } = useAuth();
  const [experts, setExperts] = useState<ExpertListItem[]>([]);
  const [pulseMap, setPulseMap] = useState<Record<string, Pulse>>({});
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');

  const load = async () => {
    if (!token) return;
    setLoading(true);
    const [expertRes, dashboard] = await Promise.all([
      apiClient.getExperts(token),
      editorialApi.getDashboard(token),
    ]);
    setExperts(expertRes.data);
    setPulseMap(
      Object.fromEntries(
        dashboard.teamPulse.map((item) => [
          item.expertId,
          {
            voiceReadiness: item.voiceReadiness,
            lastResponseAt: item.lastResponseAt,
            draftsInProgress: item.draftsInProgress,
          },
        ]),
      ),
    );
    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => {
      setNote('Could not load experts yet.');
      setLoading(false);
    });
  }, [token]);

  const cards = useMemo(
    () =>
      experts.map((expert) => {
        const pulse = pulseMap[expert.id];
        return {
          ...expert,
          voiceReadiness:
            pulse?.voiceReadiness ?? (expert.voiceProfileStatus === 'confirmed' ? 100 : 0),
          lastResponseAt: pulse?.lastResponseAt,
          draftsInProgress: pulse?.draftsInProgress ?? 0,
        };
      }),
    [experts, pulseMap],
  );

  if (!token) return null;
  return (
    <section style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <AddExpertForm
        onSubmit={async (payload) => {
          await apiClient.createExpert(token, payload);
          await load();
        }}
      />
      {note ? <p>{note}</p> : null}
      {loading ? <Skeleton variant="list" /> : null}
      {!loading && cards.length === 0 ? <EmptyState message="Add your first expert" /> : null}
      <div className="home-grid">
        {cards.map((expert) => (
          <ExpertCard
            key={expert.id}
            id={expert.id}
            name={expert.name}
            roleTitle={expert.roleTitle}
            voiceReadiness={expert.voiceReadiness}
            lastResponseAt={expert.lastResponseAt}
            draftsInProgress={expert.draftsInProgress}
            onPing={async (expertId) => {
              await apiClient.pingExpert(token, expertId);
              setNote('Request 2 minutes sent.');
            }}
          />
        ))}
      </div>
    </section>
  );
};
