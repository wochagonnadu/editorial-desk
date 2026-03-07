// PATH: apps/web/src/pages/Settings.tsx
// WHAT: Settings page with writable workspace and team management actions
// WHY:  Removes read-only behavior and connects UI to new team contracts
// RELEVANT: apps/web/src/services/company.ts,apps/web/src/services/team.ts

import { Save } from 'lucide-react';
import type { TeamRole } from '../services/team';
import { GenerationControlsCard } from './settings/GenerationControlsCard';
import { TeamManagementCard } from './settings/TeamManagementCard';
import { useSettingsPageState } from './settings/useSettingsPageState';
import { WorkspaceSettingsCard } from './settings/WorkspaceSettingsCard';

export function Settings() {
  const {
    session,
    draft,
    managerName,
    team,
    inviteName,
    inviteEmail,
    inviteRole,
    experts,
    previewExpertId,
    previewTopicTitle,
    previewInstructions,
    previewSample,
    previewError,
    loadError,
    saveError,
    inviteError,
    roleError,
    notice,
    isSaving,
    isInviting,
    isPreviewing,
    roleUpdatingId,
    canSave,
    setDraft,
    setManagerName,
    setInviteName,
    setInviteEmail,
    setInviteRole,
    setPreviewField,
    setGenerationTone,
    setGenerationAudience,
    setGenerationGuardrailText,
    handleSave,
    handlePreview,
    handleInvite,
    handleRoleChange,
  } = useSettingsPageState();

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

      {loadError ? <div className="card text-red-600">{loadError}</div> : null}
      {saveError ? <div className="card text-red-600">{saveError}</div> : null}
      {notice ? <div className="card text-green-700">{notice}</div> : null}

      {!draft ? <div className="card text-sm text-ink-500">Loading workspace...</div> : null}
      {draft ? (
        <>
          <WorkspaceSettingsCard
            value={draft}
            managerName={managerName}
            saving={isSaving}
            onChange={(field, value) =>
              setDraft((current) => (current ? { ...current, [field]: value } : current))
            }
            onManagerNameChange={setManagerName}
          />
          <GenerationControlsCard
            value={draft.generation_policy}
            saving={isSaving}
            previewing={isPreviewing}
            experts={experts}
            previewExpertId={previewExpertId}
            previewTopicTitle={previewTopicTitle}
            previewInstructions={previewInstructions}
            previewSample={previewSample}
            previewError={previewError}
            onToneChange={setGenerationTone}
            onAudienceChange={setGenerationAudience}
            onGuardrailTextChange={setGenerationGuardrailText}
            onPreviewFieldChange={setPreviewField}
            onPreview={handlePreview}
          />
        </>
      ) : null}

      <TeamManagementCard
        team={team}
        inviting={isInviting}
        roleUpdatingId={roleUpdatingId}
        canManageRoles={session?.user.role === 'owner'}
        inviteError={inviteError}
        roleError={roleError}
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
