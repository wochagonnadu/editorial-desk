// PATH: apps/web/src/pages/TopicsPage.tsx
// WHAT: Topic list with manual creation and status filtering
// WHY:  Lets managers seed and manage draft pipeline inputs
// RELEVANT: apps/web/src/services/editorial-api.ts,apps/web/src/pages/DraftsPage.tsx

import { FormEvent, useEffect, useState } from 'react';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { editorialApi } from '../services/editorial-api';
import type { TopicItem } from '../services/editorial-types';

export const TopicsPage = () => {
  const { token } = useAuth();
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await editorialApi.getTopics(token, status || undefined);
      setTopics(response.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [token, status]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    await editorialApi.createTopic(token, { title, description });
    setTitle('');
    setDescription('');
    await load();
  };

  const approve = async (topicId: string) => {
    if (!token) return;
    await editorialApi.approveTopic(token, topicId);
    await load();
  };

  const reject = async (topicId: string) => {
    if (!token) return;
    await editorialApi.rejectTopic(token, topicId, 'Rejected by manager');
    await load();
  };

  if (loading) return <Skeleton variant="list" />;

  return (
    <section>
      <form className="card" onSubmit={create}>
        <h3>Create topic</h3>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title"
          required
        />
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description"
        />
        <button className="btn-primary" type="submit">
          Create
        </button>
      </form>

      <label>
        Filter{' '}
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">all</option>
          <option value="proposed">proposed</option>
          <option value="approved">approved</option>
        </select>
      </label>
      <div className="list">
        {topics.map((topic) => (
          <article className="card" key={topic.id}>
            <h3>{topic.title}</h3>
            <p>{topic.description}</p>
            <p>Status: {topic.status}</p>
            {topic.status === 'proposed' ? (
              <div className="row">
                <button className="btn-secondary" onClick={() => approve(topic.id)}>
                  Approve
                </button>
                <button className="btn-secondary" onClick={() => reject(topic.id)}>
                  Reject
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
};
