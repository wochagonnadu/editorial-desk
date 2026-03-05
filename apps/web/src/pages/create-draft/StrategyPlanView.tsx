// PATH: apps/web/src/pages/create-draft/StrategyPlanView.tsx
// WHAT: Renders structured 12-week strategy plan with copy actions
// WHY:  Keeps CreateDraft page readable while exposing pillar/cluster/FAQ details
// RELEVANT: apps/web/src/pages/CreateDraft.tsx,apps/web/src/services/topics.ts

import type { StrategyCopyPayload, StrategyPlan } from '../../services/topics';

interface StrategyPlanViewProps {
  plan: StrategyPlan;
  isCopying: boolean;
  copyingItemId: string | null;
  onCopyCluster: (itemId: string, payload: StrategyCopyPayload) => Promise<void> | void;
  onCopyFaq: (itemId: string, payload: StrategyCopyPayload) => Promise<void> | void;
}

export function StrategyPlanView(props: StrategyPlanViewProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-500">Plan horizon: {props.plan.horizon_weeks} weeks</p>
      {props.plan.pillars.map((pillar) => (
        <article key={pillar.pillar_id} className="border border-ink-100 rounded-2xl p-4 space-y-4">
          <header>
            <h3 className="text-lg font-medium text-ink-900">{pillar.title}</h3>
            <p className="text-sm text-ink-500 mt-1">Goal: {pillar.goal}</p>
          </header>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-ink-700">Clusters</h4>
            {pillar.clusters.length === 0 ? (
              <p className="text-sm text-ink-400">No clusters generated.</p>
            ) : (
              pillar.clusters.map((cluster) => (
                <div
                  key={cluster.item_id}
                  className="rounded-xl border border-ink-100 p-3 space-y-2"
                >
                  <p className="font-medium text-ink-900">
                    W{cluster.week}: {cluster.title}
                  </p>
                  <p className="text-sm text-ink-500">Angle: {cluster.angle}</p>
                  {cluster.interlink_to.length > 0 ? (
                    <p className="text-xs text-ink-500">
                      Interlink hints: {cluster.interlink_to.join(', ')}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    disabled={props.isCopying}
                    onClick={() => props.onCopyCluster(cluster.item_id, cluster.copy_payload)}
                    className="btn-secondary"
                  >
                    {props.copyingItemId === cluster.item_id ? 'Copying...' : 'Copy cluster'}
                  </button>
                </div>
              ))
            )}
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-ink-700">FAQ</h4>
            {pillar.faq.length === 0 ? (
              <p className="text-sm text-ink-400">No FAQ generated.</p>
            ) : (
              pillar.faq.map((faq) => (
                <div key={faq.item_id} className="rounded-xl border border-ink-100 p-3 space-y-2">
                  <p className="font-medium text-ink-900">
                    W{faq.week}: {faq.question}
                  </p>
                  <p className="text-sm text-ink-500">{faq.short_answer}</p>
                  {faq.interlink_to.length > 0 ? (
                    <p className="text-xs text-ink-500">
                      Interlink hints: {faq.interlink_to.join(', ')}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    disabled={props.isCopying}
                    onClick={() => props.onCopyFaq(faq.item_id, faq.copy_payload)}
                    className="btn-secondary"
                  >
                    {props.copyingItemId === faq.item_id ? 'Copying...' : 'Copy FAQ'}
                  </button>
                </div>
              ))
            )}
          </section>
        </article>
      ))}

      {props.plan.interlinking.length > 0 ? (
        <section className="rounded-xl border border-ink-100 p-3 space-y-2">
          <h4 className="text-sm font-semibold text-ink-700">Interlink map</h4>
          <ul className="text-sm text-ink-500 space-y-1">
            {props.plan.interlinking.map((edge, index) => (
              <li key={`${edge.from_item_id}-${edge.to_item_id}-${index}`}>
                {edge.from_item_id} {'->'} {edge.to_item_id} ({edge.anchor_hint})
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
