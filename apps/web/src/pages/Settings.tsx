// PATH: apps/web/src/pages/Settings.tsx
// WHAT: Settings page with writable workspace and team management actions
// WHY:  Removes read-only behavior and connects UI to new team contracts
// RELEVANT: apps/web/src/services/company.ts,apps/web/src/services/team.ts

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import {
  fetchCompanySettings,
  updateCompanySettings,
  type CompanySettings,
} from '../services/company';
import { useSession } from '../services/session';
import {
  fetchTeamUsers,
  inviteTeamUser,
  updateTeamUserRole,
  type TeamRole,
  type TeamUser,
} from '../services/team';
import { TeamManagementCard } from './settings/TeamManagementCard';
import { WorkspaceSettingsCard } from './settings/WorkspaceSettingsCard';

export function Settings() {
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

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Settings</h1>
          <p className="text-ink-500 mt-1">Manage your newsroom preferences.</p>
        </div>
        <button className="btn-primary" disabled={!canSave || isSaving} onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Saving...' : 'Save changes'}
        </button>
      </header>

      {error ? <div className="card text-red-600">{error}</div> : null}
      {notice ? <div className="card text-green-700">{notice}</div> : null}

      {!draft ? <div className="card text-sm text-ink-500">Loading workspace...</div> : null}
      {draft ? (
        <WorkspaceSettingsCard
          value={draft}
          saving={isSaving}
          onChange={(field, value) =>
            setDraft((current) => (current ? { ...current, [field]: value } : current))
          }
        />
      ) : null}

      <TeamManagementCard
        team={team}
        inviting={isInviting}
        roleUpdatingId={roleUpdatingId}
        canManageRoles={session?.user.role === 'owner'}
        inviteName={inviteName}
        inviteEmail={inviteEmail}
        inviteRole={inviteRole}
        onInviteField={(field, value) => {
          if (field === 'name') setInviteName(value);
          if (field === 'email') setInviteEmail(value);
          if (field === 'role') setInviteRole(value as TeamRole);
        }}
        onInvite={handleInvite}
        onRoleChange={handleRoleChange}
      />
    </div>
  );
}
