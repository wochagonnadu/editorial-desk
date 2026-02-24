// PATH: apps/web/src/components/VersionDiff.tsx
// WHAT: Compact rendering of per-version diff metadata
// WHY:  Makes immutable version history readable without raw JSON dump
// RELEVANT: apps/web/src/pages/DraftDetailPage.tsx,apps/web/src/services/editorial-types.ts

import type { DraftVersionItem } from '../services/editorial-types';

interface VersionDiffProps {
  versions: DraftVersionItem[];
}

const valueOrDash = (value: unknown) => (value === null || typeof value === 'undefined' ? '-' : String(value));

export const VersionDiff = ({ versions }: VersionDiffProps) => {
  if (versions.length === 0) return <article className="card"><h3>Versions</h3><p>No versions yet.</p></article>;

  return (
    <article className="card">
      <h3>Versions</h3>
      {versions.map((version) => {
        const number = version.versionNumber ?? version.version_number ?? '-';
        const created = version.createdAt ?? version.created_at ?? '-';
        const voice = version.voiceScore ?? version.voice_score ?? '-';
        const diff = (version.diffFromPrevious ?? version.diff_from_previous ?? {}) as Record<string, unknown>;
        return (
          <div className="version-row" key={version.id}>
            <strong>v{number}</strong> | voice: {voice} | created: {created}
            <div>added: {valueOrDash(diff.added)} | removed: {valueOrDash(diff.removed)} | changed: {valueOrDash(diff.changed ?? diff.changes)}</div>
          </div>
        );
      })}
    </article>
  );
};
