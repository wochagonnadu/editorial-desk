// PATH: apps/web/src/pages/settings/TeamManagementCard.tsx
// WHAT: Team list, role controls, and invite form for Settings page
// WHY:  Keeps team management UI modular and easy to evolve
// RELEVANT: apps/web/src/pages/Settings.tsx,apps/web/src/services/team.ts

import { Users } from 'lucide-react';
import type { TeamRole, TeamUser } from '../../services/team';

type Props = {
  team: TeamUser[];
  inviting: boolean;
  roleUpdatingId: string | null;
  canManageRoles: boolean;
  inviteError: string | null;
  roleError: string | null;
  inviteEmail: string;
  inviteName: string;
  inviteRole: TeamRole;
  onInviteField: (field: 'email' | 'name' | 'role', value: string) => void;
  onInvite: (event: React.FormEvent) => void;
  onRoleChange: (userId: string, role: TeamRole) => void;
};

export function TeamManagementCard(props: Props) {
  const {
    team,
    inviting,
    roleUpdatingId,
    canManageRoles,
    inviteError,
    roleError,
    inviteEmail,
    inviteName,
    inviteRole,
    onInviteField,
    onInvite,
    onRoleChange,
  } = props;

  return (
    <section id="team-management" className="card space-y-4">
      <h2 className="text-xl font-serif font-medium border-b border-ink-100 pb-3">
        Team Management
      </h2>
      <form onSubmit={onInvite} className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <input
          value={inviteName}
          onChange={(e) => onInviteField('name', e.target.value)}
          placeholder="Name"
          className="px-3 py-2 rounded-xl border border-ink-100"
          disabled={inviting || !canManageRoles}
        />
        <input
          value={inviteEmail}
          onChange={(e) => onInviteField('email', e.target.value)}
          placeholder="Email"
          className="px-3 py-2 rounded-xl border border-ink-100"
          disabled={inviting || !canManageRoles}
        />
        <select
          value={inviteRole}
          onChange={(e) => onInviteField('role', e.target.value)}
          className="px-3 py-2 rounded-xl border border-ink-100"
          disabled={inviting || !canManageRoles}
        >
          <option value="manager">manager</option>
          <option value="owner">owner</option>
        </select>
        <button
          type="submit"
          className="btn-secondary"
          disabled={inviting || !canManageRoles || !inviteEmail}
        >
          {inviting ? 'Inviting...' : 'Invite user'}
        </button>
      </form>
      {!canManageRoles ? (
        <p className="text-xs text-ink-500">Only owner can invite and change roles.</p>
      ) : null}
      {inviteError ? <p className="text-sm text-red-600">{inviteError}</p> : null}
      {roleError ? <p className="text-sm text-red-600">{roleError}</p> : null}
      {team.length === 0 ? <p className="text-sm text-ink-500">No team members found.</p> : null}
      <div className="space-y-3">
        {team.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-4 bg-white border border-ink-100 rounded-xl"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-ink-100 flex items-center justify-center text-ink-500">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium text-ink-900">{member.name}</p>
                <p className="text-sm text-ink-500">{member.email}</p>
              </div>
            </div>
            <select
              value={member.role}
              onChange={(e) => onRoleChange(member.id, e.target.value as TeamRole)}
              disabled={!canManageRoles || roleUpdatingId === member.id}
              className="text-sm font-medium text-ink-500 bg-beige-50 px-3 py-1 rounded-lg border border-ink-100"
            >
              <option value="owner">owner</option>
              <option value="manager">manager</option>
            </select>
          </div>
        ))}
      </div>
    </section>
  );
}
