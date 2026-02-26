// PATH: apps/web/src/components/drafts/CreateDraftForm.tsx
// WHAT: Pure form UI for MVP draft creation by expert/topic
// WHY:  Keeps CreateDraftPage short and focused on orchestration
// RELEVANT: apps/web/src/pages/CreateDraftPage.tsx,apps/web/src/services/editorial-api.ts

import type { ExpertListItem } from '../../services/api';
import type { TopicItem } from '../../services/editorial-types';
import type { FormEvent } from 'react';

interface CreateDraftFormProps {
  readyExperts: ExpertListItem[];
  topics: TopicItem[];
  expertId: string;
  topicMode: 'existing' | 'new';
  topicId: string;
  newTitle: string;
  newDescription: string;
  busy: boolean;
  onExpertIdChange: (value: string) => void;
  onTopicModeChange: (value: 'existing' | 'new') => void;
  onTopicIdChange: (value: string) => void;
  onNewTitleChange: (value: string) => void;
  onNewDescriptionChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function CreateDraftForm(props: CreateDraftFormProps) {
  return (
    <form className="card expert-setup-form" onSubmit={props.onSubmit}>
      <label htmlFor="expert-id">Expert</label>
      <select
        id="expert-id"
        value={props.expertId}
        onChange={(e) => props.onExpertIdChange(e.target.value)}
      >
        <option value="">Select expert...</option>
        {props.readyExperts.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} ({item.roleTitle})
          </option>
        ))}
      </select>

      <label htmlFor="topic-mode">Topic source</label>
      <select
        id="topic-mode"
        value={props.topicMode}
        onChange={(e) => props.onTopicModeChange(e.target.value as 'existing' | 'new')}
      >
        <option value="existing">Use approved topic</option>
        <option value="new">Create new topic now</option>
      </select>

      {props.topicMode === 'existing' ? (
        <>
          <label htmlFor="topic-id">Approved topic</label>
          <select
            id="topic-id"
            value={props.topicId}
            onChange={(e) => props.onTopicIdChange(e.target.value)}
          >
            <option value="">Select topic...</option>
            {props.topics.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </>
      ) : (
        <>
          <label htmlFor="new-title">Topic title</label>
          <input
            id="new-title"
            value={props.newTitle}
            onChange={(e) => props.onNewTitleChange(e.target.value)}
            placeholder="e.g. Enterprise AI Adoption in 2026"
          />
          <label htmlFor="new-description">Topic description</label>
          <input
            id="new-description"
            value={props.newDescription}
            onChange={(e) => props.onNewDescriptionChange(e.target.value)}
            placeholder="Optional short brief"
          />
        </>
      )}

      <button
        type="submit"
        className="btn-primary"
        disabled={
          props.busy || !props.expertId || (props.topicMode === 'existing' && !props.topicId)
        }
      >
        {props.busy ? 'Creating...' : 'Create draft and open editor'}
      </button>
    </form>
  );
}
