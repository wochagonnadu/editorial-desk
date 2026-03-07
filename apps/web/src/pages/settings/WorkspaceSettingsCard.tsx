// PATH: apps/web/src/pages/settings/WorkspaceSettingsCard.tsx
// WHAT: Editable workspace and manager setup form for Settings page
// WHY:  Keeps first-run setup fields editable later from one shared settings surface
// RELEVANT: apps/web/src/pages/Settings.tsx,apps/web/src/services/company.ts,apps/web/src/services/user.ts

import type { CompanySettings } from '../../services/company';

type Props = {
  value: CompanySettings;
  managerName: string;
  saving: boolean;
  onChange: (field: 'name' | 'domain' | 'language' | 'description', value: string) => void;
  onManagerNameChange: (value: string) => void;
};

export function WorkspaceSettingsCard({
  value,
  managerName,
  saving,
  onChange,
  onManagerNameChange,
}: Props) {
  return (
    <section id="workspace-settings" className="card space-y-4">
      <h2 className="text-xl font-serif font-medium border-b border-ink-100 pb-3">
        Workspace Settings
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <label className="space-y-1">
          <span className="text-ink-500">Manager name</span>
          <input
            value={managerName}
            onChange={(event) => onManagerNameChange(event.target.value)}
            disabled={saving}
            className="w-full px-3 py-2 rounded-xl border border-ink-100 bg-white"
          />
        </label>
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
      <label className="space-y-1 block text-sm">
        <span className="text-ink-500">Company description</span>
        <textarea
          value={value.description}
          onChange={(event) => onChange('description', event.target.value)}
          disabled={saving}
          rows={5}
          className="w-full px-3 py-2 rounded-2xl border border-ink-100 bg-white"
        />
      </label>
    </section>
  );
}
