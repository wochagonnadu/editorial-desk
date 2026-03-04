// PATH: apps/web/src/pages/settings/useSettingsPageState.ts
// WHAT: State and actions hook for Settings workspace and team management
// WHY:  Keeps Settings page component focused on rendering and under 100 LOC
// RELEVANT: apps/web/src/pages/Settings.tsx,apps/web/src/services/company.ts

import { useEffect, useState } from 'react';
import {
  fetchCompanySettings,
  updateCompanySettings,
  type CompanySettings,
} from '../../services/company';
import { useSession } from '../../services/session';
import {
  fetchTeamUsers,
  inviteTeamUser,
  updateTeamUserRole,
  type TeamRole,
  type TeamUser,
} from '../../services/team';

export const useSettingsPageState = () => {
  const { session } = useSession();
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [draft, setDraft] = useState<CompanySettings | null>(null);
  const [team, setTeam] = useState<TeamUser[]>([]);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('manager');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);

  const load = async () => {
    if (!session) return;
    try {
      setError(null);
      const [companyData, teamData] = await Promise.all([
        fetchCompanySettings(session.token),
        fetchTeamUsers(session.token),
      ]);
      setCompany(companyData);
      setDraft(companyData);
      setTeam(teamData);
    } catch {
      setError('Could not load settings');
    }
  };

  useEffect(() => {
    void load();
  }, [session]);

  const canSave =
    Boolean(company && draft) &&
    (company?.name !== draft?.name ||
      company?.domain !== draft?.domain ||
      company?.language !== draft?.language);

  const handleSave = async () => {
    if (!session || !draft) return;
    try {
      setError(null);
      setNotice(null);
      setIsSaving(true);
      const updated = await updateCompanySettings(session.token, draft);
      setCompany(updated);
      setDraft(updated);
      setNotice('Workspace settings saved');
    } catch {
      setError('Could not save workspace settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoleChange = async (userId: string, role: TeamRole) => {
    if (!session) return;
    try {
      setError(null);
      setNotice(null);
      setRoleUpdatingId(userId);
      await updateTeamUserRole(session.token, userId, role);
      setTeam((current) => current.map((item) => (item.id === userId ? { ...item, role } : item)));
      setNotice('Role updated');
    } catch {
      setError('Could not update role');
    } finally {
      setRoleUpdatingId(null);
    }
  };

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) return;
    try {
      setError(null);
      setNotice(null);
      setIsInviting(true);
      const result = await inviteTeamUser(session.token, {
        name: inviteName || undefined,
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteName('');
      setInviteEmail('');
      setInviteRole('manager');
      setNotice(result.reused ? 'Invite already pending for this email' : 'Invite sent');
      await load();
    } catch {
      setError('Could not invite team member');
    } finally {
      setIsInviting(false);
    }
  };

  return {
    session,
    draft,
    team,
    inviteName,
    inviteEmail,
    inviteRole,
    error,
    notice,
    isSaving,
    isInviting,
    roleUpdatingId,
    canSave,
    setDraft,
    setInviteName,
    setInviteEmail,
    setInviteRole,
    handleSave,
    handleInvite,
    handleRoleChange,
  };
};
