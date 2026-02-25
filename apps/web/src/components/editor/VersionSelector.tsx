// PATH: apps/web/src/components/editor/VersionSelector.tsx
// WHAT: Selector версий черновика с переключением контента
// WHY:  FR-020 и FR-023 — доступ к истории immutable versions
// RELEVANT: apps/web/src/pages/DraftDetailPage.tsx,apps/web/src/services/editorial-types.ts

import type { DraftVersionItem } from '../../services/editorial-types';

interface VersionSelectorProps {
  versions: DraftVersionItem[];
  currentVersionId?: string;
  onSelect: (versionId: string) => void;
}

const labelOf = (version: DraftVersionItem): string => {
  const number = version.versionNumber ?? version.version_number ?? '?';
  const created = version.createdAt ?? version.created_at;
  if (!created) return `v${number}`;
  return `v${number} · ${new Date(created).toLocaleString()}`;
};

export function VersionSelector({ versions, currentVersionId, onSelect }: VersionSelectorProps) {
  if (!versions.length) {
    return <span>No versions yet</span>;
  }

  return (
    <label style={{ display: 'grid', gap: 'var(--space-1)' }}>
      <span>Version</span>
      <select value={currentVersionId ?? versions[0].id} onChange={(e) => onSelect(e.target.value)}>
        {versions.map((version) => (
          <option key={version.id} value={version.id}>
            {labelOf(version)}
          </option>
        ))}
      </select>
    </label>
  );
}
