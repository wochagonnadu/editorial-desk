// PATH: apps/web/src/components/drafts/CreateDraftModal.tsx
// WHAT: Модалка создания черновика — выбор эксперта и темы
// WHY:  FR-028 — create draft action; T013 — менеджер выбирает expert + topic
// RELEVANT: apps/web/src/pages/DraftsPage.tsx, apps/web/src/services/editorial-api.ts

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient, type ExpertListItem } from '../../services/api';
import { editorialApi } from '../../services/editorial-api';
import type { TopicItem } from '../../services/editorial-types';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (draftId: string) => void;
}

export function CreateDraftModal({ open, onClose, onCreated }: Props) {
  const { token } = useAuth();
  const [experts, setExperts] = useState<ExpertListItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [expertId, setExpertId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !token) return;
    // Загружаем списки при открытии
    apiClient
      .getExperts(token)
      .then((r) => setExperts(r.data))
      .catch(() => undefined);
    editorialApi
      .getTopics(token, 'approved')
      .then((r) => setTopics(r.data))
      .catch(() => undefined);
  }, [open, token]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!token || !topicId) return;
    setBusy(true);
    try {
      const result = await editorialApi.createDraft(token, topicId);
      onCreated(result.id);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  // Фильтруем экспертов с готовым voice profile (voice gate — T006b)
  const readyExperts = experts.filter((e) => e.voiceProfileStatus === 'confirmed');
  const notReadyExperts = experts.filter((e) => e.voiceProfileStatus !== 'confirmed');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Create draft"
      >
        <h2>Create Draft</h2>

        <label htmlFor="expert-select">Expert</label>
        <select id="expert-select" value={expertId} onChange={(e) => setExpertId(e.target.value)}>
          <option value="">Select expert...</option>
          {readyExperts.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
          {notReadyExperts.length > 0 && (
            <optgroup label="Voice not ready">
              {notReadyExperts.map((e) => (
                <option key={e.id} value={e.id} disabled>
                  {e.name} (voice not ready)
                </option>
              ))}
            </optgroup>
          )}
        </select>

        <label htmlFor="topic-select">Topic</label>
        <select id="topic-select" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
          <option value="">Select topic...</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>

        <div className="modal-actions">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy || !topicId}
            className="btn-primary"
          >
            {busy ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
