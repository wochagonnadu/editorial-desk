// PATH: apps/web/src/pages/settings/useSettingsPageState.ts
// WHAT: State and actions hook for Settings workspace and team management
// WHY:  Keeps Settings page component focused on rendering and under 100 LOC
// RELEVANT: apps/web/src/pages/Settings.tsx,apps/web/src/services/company.ts

import { useEffect, useState } from 'react';
import {
  fetchCompanySettings,
  previewCompanyGeneration,
  updateCompanySettings,
  type CompanySettings,
  type GenerationPolicy,
} from '../../services/company';
import { fetchExperts, type ExpertItem } from '../../services/experts';
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
  const [experts, setExperts] = useState<ExpertItem[]>([]);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('manager');
  const [previewExpertId, setPreviewExpertId] = useState('');
  const [previewTopicTitle, setPreviewTopicTitle] = useState('');
  const [previewInstructions, setPreviewInstructions] = useState('');
  const [previewSample, setPreviewSample] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);

  const toList = (value: string) =>
    value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);

  const setGenerationTone = (tone: string) =>
    setDraft((current) =>
      current ? { ...current, generation_policy: { ...current.generation_policy, tone } } : current,
    );
  const setGenerationAudience = (defaultAudience: GenerationPolicy['default_audience']) =>
    setDraft((current) =>
      current
        ? {
            ...current,
            generation_policy: { ...current.generation_policy, default_audience: defaultAudience },
          }
        : current,
    );
  const setGenerationGuardrailText = (
    field: 'must_include' | 'avoid' | 'banned_phrases',
    value: string,
  ) =>
    setDraft((current) =>
      current
        ? {
            ...current,
            generation_policy: {
              ...current.generation_policy,
              guardrails: { ...current.generation_policy.guardrails, [field]: toList(value) },
            },
          }
        : current,
    );

  const load = async () => {
    if (!session) return;
    try {
      setError(null);
      const [companyData, teamData, expertsData] = await Promise.all([
        fetchCompanySettings(session.token),
        fetchTeamUsers(session.token),
        fetchExperts(session.token),
      ]);
      setCompany(companyData);
      setDraft(companyData);
      setTeam(teamData);
      setExperts(expertsData);
      setPreviewExpertId((current) => current || expertsData[0]?.id || '');
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
      company?.language !== draft?.language ||
      JSON.stringify(company?.generation_policy) !== JSON.stringify(draft?.generation_policy));

  const handleSave = async () => {
    if (!session || !draft) return;
    try {
      setError(null);
      setNotice(null);
      setIsSaving(true);
      const updated = await updateCompanySettings(session.token, {
        name: draft.name,
        domain: draft.domain,
        language: draft.language,
        generation_policy: draft.generation_policy,
      });
      setCompany(updated);
      setDraft(updated);
      setNotice('Workspace settings saved');
    } catch {
      setError('Could not save workspace settings');
    } finally {
      setIsSaving(false);
    }
  };

  const setPreviewField = (field: 'expert_id' | 'topic_title' | 'instructions', value: string) => {
    if (field === 'expert_id') setPreviewExpertId(value);
    if (field === 'topic_title') setPreviewTopicTitle(value);
    if (field === 'instructions') setPreviewInstructions(value);
  };

  const handlePreview = async () => {
    if (!session || !previewExpertId || !previewTopicTitle.trim()) return;
    try {
      setError(null);
      setPreviewError(null);
      setPreviewSample(null);
      setIsPreviewing(true);
      const result = await previewCompanyGeneration(session.token, {
        expert_id: previewExpertId,
        topic_title: previewTopicTitle.trim(),
        instructions: previewInstructions.trim() || undefined,
      });
      setPreviewSample(result.sample_markdown);
    } catch {
      setPreviewError('Could not generate preview');
    } finally {
      setIsPreviewing(false);
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
    experts,
    inviteName,
    inviteEmail,
    inviteRole,
    previewExpertId,
    previewTopicTitle,
    previewInstructions,
    previewSample,
    previewError,
    error,
    notice,
    isSaving,
    isInviting,
    isPreviewing,
    roleUpdatingId,
    canSave,
    setDraft,
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
  };
};
