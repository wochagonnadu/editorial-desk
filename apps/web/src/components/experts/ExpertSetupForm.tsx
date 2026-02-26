// PATH: apps/web/src/components/experts/ExpertSetupForm.tsx
// WHAT: Form to create expert with onboarding-ready profile and source URLs
// WHY:  Uses current expert model instead of demo-only local setup state
// RELEVANT: apps/web/src/pages/ExpertSetupPage.tsx,apps/web/src/services/api.ts

import { FormEvent, useMemo, useState } from 'react';

interface ExpertSetupFormProps {
  saving: boolean;
  onSubmit(payload: {
    name: string;
    role_title: string;
    email: string;
    domain: string;
    public_text_urls: string[];
  }): Promise<void>;
}

export function ExpertSetupForm(props: ExpertSetupFormProps) {
  const [name, setName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [email, setEmail] = useState('');
  const [domain, setDomain] = useState('business');
  const [sourceInput, setSourceInput] = useState('');
  const [sources, setSources] = useState<string[]>([]);

  const canSubmit = useMemo(
    () => name.trim() && roleTitle.trim() && email.trim() && !props.saving,
    [name, roleTitle, email, props.saving],
  );

  const addSource = () => {
    const next = sourceInput.trim();
    if (!next || sources.includes(next)) return;
    setSources((current) => [...current, next]);
    setSourceInput('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    await props.onSubmit({
      name: name.trim(),
      role_title: roleTitle.trim(),
      email: email.trim().toLowerCase(),
      domain,
      public_text_urls: sources,
    });
  };

  return (
    <form className="card expert-setup-form" onSubmit={submit}>
      <h3>Expert Setup</h3>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Full name"
        required
      />
      <input
        value={roleTitle}
        onChange={(e) => setRoleTitle(e.target.value)}
        placeholder="Role title"
        required
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Work email"
        required
      />
      <select value={domain} onChange={(event) => setDomain(event.target.value)}>
        <option value="business">business</option>
        <option value="medical">medical</option>
        <option value="legal">legal</option>
        <option value="education">education</option>
      </select>

      <div className="expert-source-row">
        <input
          value={sourceInput}
          onChange={(event) => setSourceInput(event.target.value)}
          placeholder="Public article/profile URL"
        />
        <button type="button" className="btn-secondary" onClick={addSource}>
          Add URL
        </button>
      </div>

      <ul className="expert-source-list">
        {sources.map((url) => (
          <li key={url}>
            <span>{url}</span>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSources((current) => current.filter((item) => item !== url))}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <button className="btn-primary" type="submit" disabled={!canSubmit}>
        {props.saving ? 'Creating expert...' : 'Create expert and start onboarding'}
      </button>
    </form>
  );
}
