// PATH: apps/web/src/components/editor/FactcheckPanel.tsx
// WHAT: Панель fact-check: claim count, evidence status, общий риск
// WHY:  FR-024 — в редакторе нужен быстрый обзор фактов и рисков
// RELEVANT: apps/web/src/pages/DraftDetailPage.tsx,apps/web/src/services/editorial-types.ts

interface FactcheckReport {
  status?: string;
  results?: Array<Record<string, unknown>>;
  overallRiskScore?: number | string;
  overall_risk_score?: number | string;
}

interface FactcheckPanelProps {
  report?: FactcheckReport | null;
}

const colorByVerdict = (verdict: string): string => {
  if (verdict.includes('confirm')) return 'var(--color-primary)';
  if (verdict.includes('reject')) return 'var(--color-danger)';
  return 'var(--color-warning)';
};

export function FactcheckPanel({ report }: FactcheckPanelProps) {
  if (!report) return <p>No fact-check results yet.</p>;

  const results = report.results ?? [];
  const risk = report.overallRiskScore ?? report.overall_risk_score ?? '-';

  return (
    <section className="card" style={{ margin: 0 }}>
      <h4>Factcheck</h4>
      <p>Status: {report.status ?? 'pending'}</p>
      <p>Claims: {results.length}</p>
      <p>Overall risk: {risk}</p>
      <div className="list">
        {results.map((item, idx) => {
          const verdict = String(item.verdict ?? 'needs clarification');
          const claim = String(item.claim ?? item.text ?? `Claim ${idx + 1}`);
          return (
            <div key={idx} className="version-row" style={{ color: colorByVerdict(verdict) }}>
              {claim} · {verdict}
            </div>
          );
        })}
      </div>
    </section>
  );
}
