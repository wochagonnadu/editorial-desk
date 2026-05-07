// PATH: apps/web/scripts/smoke-create-topic-api-mock.mjs
// WHAT: CDP API mock for create-topic browser smoke
// WHY:  Keeps smoke flow independent from DB, LLM, and external services
// RELEVANT: apps/web/scripts/smoke-create-topic-draft-editor.mjs,apps/web/src/services/topics.ts,apps/web/src/services/drafts.ts

import {
  createdDraftId,
  draftDetailResponse,
  draftVersionsResponse,
  expert,
  strategyPlanResponse,
} from './smoke-create-topic-fixtures.mjs';

const jsonResponse = (body, responseCode = 200) => ({
  responseCode,
  responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
  body: Buffer.from(JSON.stringify(body)).toString('base64'),
});

export const fillCreateTopicApiMock = (cdp) => {
  let topicSequence = 0;
  const topics = [];

  cdp.on('Fetch.requestPaused', (event) => {
    const url = new URL(event.request.url);
    const body = JSON.parse(event.request.postData || '{}');
    let response = {};

    if (url.pathname === '/api/v1/experts') response = { data: [expert] };
    if (url.pathname === '/api/v1/topics/strategy-plan') response = strategyPlanResponse(body.topic_seed);
    if (url.pathname === '/api/v1/topics' && event.request.method === 'GET') {
      response = { data: topics.map((topic) => ({ ...topic, expert: { id: expert.id, name: expert.name } })) };
    }
    if (url.pathname === '/api/v1/topics' && event.request.method === 'POST') {
      const topic = { id: `topic-smoke-${++topicSequence}`, title: body.title, status: 'proposed' };
      topics.unshift(topic);
      response = { id: topic.id, status: topic.status };
    }

    const approveMatch = url.pathname.match(/^\/api\/v1\/topics\/([^/]+)\/approve$/);
    if (approveMatch) {
      const topic = topics.find((item) => item.id === approveMatch[1]);
      if (topic) topic.status = 'approved';
      response = { id: approveMatch[1], status: 'approved' };
    }

    if (url.pathname === '/api/v1/drafts' && event.request.method === 'POST') {
      const topic = topics.find((item) => item.id === body.topic_id);
      if (topic?.status !== 'approved') {
        response = { error: { code: 'SMOKE_ERROR', message: 'Topic must be approved before draft creation' } };
        void cdp.send('Fetch.fulfillRequest', { requestId: event.requestId, ...jsonResponse(response, 409) });
        return;
      }
      response = { id: createdDraftId, topic_id: body.topic_id, status: 'drafting' };
    }

    if (url.pathname === `/api/v1/drafts/${createdDraftId}`) response = draftDetailResponse();
    if (url.pathname === `/api/v1/drafts/${createdDraftId}/versions`) response = draftVersionsResponse();
    if (url.pathname === '/api/v1/audit') response = { data: [] };

    void cdp.send('Fetch.fulfillRequest', { requestId: event.requestId, ...jsonResponse(response) });
  });
};
