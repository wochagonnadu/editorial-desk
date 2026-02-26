// PATH: apps/web/src/pages/CreateDraftPage.tsx
// WHAT: MVP create-draft flow using real topics and draft endpoints
// WHY:  Separates demo strategy ideas from production draft creation path
// RELEVANT: apps/web/src/services/editorial-api.ts,apps/web/src/pages/DraftDetailPage.tsx

import { Link, useNavigate } from 'react-router-dom';
import { CreateDraftForm } from '../components/drafts/CreateDraftForm';
import { useAuth } from '../context/AuthContext';
import { useCreateDraftFlow } from './drafts/useCreateDraftFlow';

export const CreateDraftPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const flow = useCreateDraftFlow(token, (draftId) => navigate(`/drafts/${draftId}`));

  if (!token) return null;

  return (
    <section className="experts-page" style={{ gap: 'var(--space-4)' }}>
      <Link to="/drafts" className="btn-secondary" style={{ justifySelf: 'start' }}>
        Back to drafts
      </Link>
      <header>
        <h1 style={{ marginBottom: 'var(--space-1)' }}>Create Draft</h1>
        <p className="experts-subtitle">
          MVP flow: choose expert, then use existing approved topic or create a new topic and start
          a draft.
        </p>
      </header>
      {flow.note ? <p className="draft-editor-note">{flow.note}</p> : null}

      <CreateDraftForm
        readyExperts={flow.readyExperts}
        topics={flow.topics}
        expertId={flow.expertId}
        topicMode={flow.topicMode}
        topicId={flow.topicId}
        newTitle={flow.newTitle}
        newDescription={flow.newDescription}
        busy={flow.busy}
        onExpertIdChange={flow.setExpertId}
        onTopicModeChange={flow.setTopicMode}
        onTopicIdChange={flow.setTopicId}
        onNewTitleChange={flow.setNewTitle}
        onNewDescriptionChange={flow.setNewDescription}
        onSubmit={flow.submit}
      />
    </section>
  );
};
