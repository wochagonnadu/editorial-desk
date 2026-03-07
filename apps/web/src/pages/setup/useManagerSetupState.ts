// PATH: apps/web/src/pages/setup/useManagerSetupState.ts
// WHAT: State and submit logic for the manager setup screen
// WHY:  Keeps the setup page focused on rendering while user and company writes stay explicit
// RELEVANT: apps/web/src/pages/ManagerSetup.tsx,apps/web/src/services/user.ts,apps/web/src/services/company.ts

import { useEffect, useState } from 'react';
import { fetchCompanySettings, updateCompanySettings } from '../../services/company';
import { useSession } from '../../services/session';
import { fetchCurrentUser, fetchSetupStatus, updateCurrentUser } from '../../services/user';

export const useManagerSetupState = () => {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [managerName, setManagerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyDomain, setCompanyDomain] = useState('business');
  const [companyDescription, setCompanyDescription] = useState('');
  const [editorialTone, setEditorialTone] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!session) return;
      try {
        setError(null);
        const [setup, user, company] = await Promise.all([
          fetchSetupStatus(session.token),
          fetchCurrentUser(session.token),
          fetchCompanySettings(session.token),
        ]);
        setSetupRequired(setup.setupRequired);
        setManagerName(user.name);
        setCompanyName(company.name);
        setCompanyDomain(company.domain);
        setCompanyDescription(company.description);
        setEditorialTone(company.generation_policy.tone);
      } catch {
        setError('Could not load workspace setup');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [session]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) return;
    try {
      setSaving(true);
      setError(null);
      await updateCurrentUser(session.token, { name: managerName.trim() });
      await updateCompanySettings(session.token, {
        name: companyName.trim(),
        domain: companyDomain,
        description: companyDescription.trim(),
        generation_policy: editorialTone.trim() ? { tone: editorialTone.trim() } : undefined,
      });
      setSetupRequired(false);
    } catch {
      setError('Could not save workspace setup');
    } finally {
      setSaving(false);
    }
  };

  return {
    loading,
    saving,
    setupRequired,
    error,
    managerName,
    companyName,
    companyDomain,
    companyDescription,
    editorialTone,
    setManagerName,
    setCompanyName,
    setCompanyDomain,
    setCompanyDescription,
    setEditorialTone,
    handleSubmit,
  };
};
