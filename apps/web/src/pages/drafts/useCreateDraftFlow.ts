// PATH: apps/web/src/pages/drafts/useCreateDraftFlow.ts
// WHAT: State and submit logic for the CreateDraftPage MVP flow
// WHY:  Keeps page under 100 LOC and isolates endpoint orchestration
// RELEVANT: apps/web/src/pages/CreateDraftPage.tsx,apps/web/src/services/editorial-api.ts

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { apiClient, type ExpertListItem } from '../../services/api';
import { editorialApi } from '../../services/editorial-api';
import type { TopicItem } from '../../services/editorial-types';

export function useCreateDraftFlow(token: string | null, onCreated: (draftId: string) => void) {
  const [experts, setExperts] = useState<ExpertListItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [expertId, setExpertId] = useState('');
  const [topicMode, setTopicMode] = useState<'existing' | 'new'>('existing');
  const [topicId, setTopicId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!token) return;
    apiClient
      .getExperts(token)
      .then((res) => setExperts(res.data))
      .catch(() => setExperts([]));
  }, [token]);

  useEffect(() => {
    if (!token || !expertId) {
      setTopics([]);
      setTopicId('');
      return;
    }
    editorialApi
      .getTopics(token, 'approved', expertId)
      .then((res) => setTopics(res.data))
      .catch(() => setTopics([]));
  }, [token, expertId]);

  const readyExperts = useMemo(
    () => experts.filter((item) => item.voiceProfileStatus === 'confirmed'),
    [experts],
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !expertId) return;
    setBusy(true);
    setNote('');
    try {
      let finalTopicId = topicId;
      if (topicMode === 'new') {
        if (!newTitle.trim()) {
          setNote('Topic title is required for new topic flow.');
          return;
        }
        const topic = await editorialApi.createTopic(token, {
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          expert_id: expertId,
        });
        await editorialApi.approveTopic(token, topic.id);
        finalTopicId = topic.id;
      }
      if (!finalTopicId) {
        setNote('Select an approved topic or create a new one.');
        return;
      }
      const draft = await editorialApi.createDraft(token, finalTopicId);
      onCreated(draft.id);
    } catch (caught) {
      setNote(caught instanceof Error ? caught.message : 'Could not create draft');
    } finally {
      setBusy(false);
    }
  };

  return {
    readyExperts,
    topics,
    expertId,
    setExpertId,
    topicMode,
    setTopicMode,
    topicId,
    setTopicId,
    newTitle,
    setNewTitle,
    newDescription,
    setNewDescription,
    busy,
    note,
    submit,
  };
}
