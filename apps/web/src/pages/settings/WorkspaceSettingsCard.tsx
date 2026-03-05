// PATH: apps/web/src/pages/settings/WorkspaceSettingsCard.tsx
// WHAT: Editable workspace form for company settings in Settings page
// WHY:  Isolates company form UI from page-level data loading and actions
// RELEVANT: apps/web/src/pages/Settings.tsx,apps/web/src/services/company.ts

import type { CompanySettings } from '../../services/company';

type Props = {
  value: CompanySettings;
  saving: boolean;
  onChange: (field: 'name' | 'domain' | 'language', value: string) => void;
};

export function WorkspaceSettingsCard({ value, saving, onChange }: Props) {
  return (
    <section className="card space-y-4">
      <h2 className="text-xl font-serif font-medium border-b border-ink-100 pb-3">
        Workspace Settings
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <label className="space-y-1">
          <span className="text-ink-500">Workspace Name</span>
          <input
            value={value.name}
            onChange={(event) => onChange('name', event.target.value)}
            disabled={saving}
            className="w-full px-3 py-2 rounded-xl border border-ink-100 bg-white"
          />
        </label>
        <label className="space-y-1">
          <span className="text-ink-500">Domain</span>
          <select
            value={value.domain}
            onChange={(event) => onChange('domain', event.target.value)}
            disabled={saving}
            className="w-full px-3 py-2 rounded-xl border border-ink-100 bg-white"
          >
            <option value="medical">medical</option>
            <option value="legal">legal</option>
            <option value="education">education</option>
            <option value="business">business</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-ink-500">Language</span>
          <input
            value={value.language}
            onChange={(event) => onChange('language', event.target.value)}
            disabled={saving}
            className="w-full px-3 py-2 rounded-xl border border-ink-100 bg-white"
          />
        </label>
      </div>
    </section>
  );
}
