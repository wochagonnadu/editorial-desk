// PATH: apps/web/src/components/AddExpertForm.tsx
// WHAT: Form for creating expert onboarding entries
// WHY:  Gives managers a quick way to start voice onboarding
// RELEVANT: apps/web/src/pages/ExpertsPage.tsx,apps/web/src/services/api.ts

import { FormEvent, useState } from 'react';

interface AddExpertFormProps {
  onSubmit(payload: {
    name: string;
    role_title: string;
    email: string;
    domain: string;
  }): Promise<void>;
}

export const AddExpertForm = ({ onSubmit }: AddExpertFormProps) => {
  const [name, setName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [email, setEmail] = useState('');
  const [domain, setDomain] = useState('business');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit({ name, role_title: roleTitle, email, domain });
    setName('');
    setRoleTitle('');
    setEmail('');
  };

  return (
    <form className="card" onSubmit={submit}>
      <h3>Add expert</h3>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Name"
        required
      />
      <input
        value={roleTitle}
        onChange={(event) => setRoleTitle(event.target.value)}
        placeholder="Role title"
        required
      />
      <input
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email"
        type="email"
        required
      />
      <select value={domain} onChange={(event) => setDomain(event.target.value)}>
        <option value="business">business</option>
        <option value="medical">medical</option>
        <option value="legal">legal</option>
        <option value="education">education</option>
      </select>
      <button className="btn-primary" type="submit">
        Start onboarding
      </button>
    </form>
  );
};
