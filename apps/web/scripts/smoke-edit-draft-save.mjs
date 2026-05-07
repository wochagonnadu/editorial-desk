// PATH: apps/web/scripts/smoke-edit-draft-save.mjs
// WHAT: Browser smoke test for editing and saving an existing draft
// WHY:  Verifies the editor keeps saved text after reload without real API or DB access
// RELEVANT: apps/web/scripts/smoke-cdp.mjs,apps/web/src/pages/DraftEditor.tsx,apps/web/src/services/drafts.ts,TESTING_PLAN.md

import { resolve } from 'node:path';
import { cleanupChrome, evaluate, launchChrome, openCdp, startDevServer, waitFor, waitForHttp } from './smoke-cdp.mjs';
import { copiedTopicTitle, createdDraftId, expert } from './smoke-create-topic-fixtures.mjs';

const appRoot = resolve(import.meta.dirname, '..');
const webPort = Number(process.env.SMOKE_WEB_PORT || 5173);
const cdpPort = Number(process.env.SMOKE_CDP_PORT || 9223);
const baseUrl = `http://127.0.0.1:${webPort}`;
const initialContent = '# Patient prep checklist\n\nBring questions and recent notes.';
const savedContent = `${initialContent}\n\nSmoke edit saved at browser level.`;
const session = { token: 'session-token', user: { id: 'user-1', email: 'smoke@local.test', role: 'owner', companyId: 'company-1' } };

const jsonResponse = (body, responseCode = 200) => ({
  responseCode,
  responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
  body: Buffer.from(JSON.stringify(body)).toString('base64'),
});

const fillDraftApiMock = (cdp) => {
  const versions = [{ id: 'version-smoke-1', versionNumber: 1, content: initialContent, summary: 'Initial smoke draft' }];
  const versionDto = (version) => ({ id: version.id, version_number: version.versionNumber, content: version.content, summary: version.summary, created_at: new Date().toISOString() });

  cdp.on('Fetch.requestPaused', (event) => {
    const url = new URL(event.request.url);
    const currentVersion = versions[0];
    let response = {};

    if (url.pathname === `/api/v1/drafts/${createdDraftId}`) {
      response = {
        id: createdDraftId,
        status: 'drafting',
        topic: { title: copiedTopicTitle },
        expert: { id: expert.id, name: expert.name },
        current_version: versionDto(currentVersion),
        factcheck_report: null,
        publish_plan: { scheduled_publish_at: null, timezone: null, is_scheduled: false },
        comments: [],
      };
    }

    if (url.pathname === `/api/v1/drafts/${createdDraftId}/versions`) {
      if (event.request.method === 'POST') {
        const body = JSON.parse(event.request.postData || '{}');
        versions.unshift({ id: 'version-smoke-2', versionNumber: 2, content: body.content, summary: body.summary });
        response = { id: 'version-smoke-2' };
      } else {
        response = { data: versions.map(versionDto) };
      }
    }

    if (url.pathname === '/api/v1/audit') response = { data: [] };
    void cdp.send('Fetch.fulfillRequest', { requestId: event.requestId, ...jsonResponse(response) });
  });
};

const runFlow = async (cdp) => {
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.setItem('editorialdesk.session', ${JSON.stringify(JSON.stringify(session))});`,
  });
  await cdp.send('Page.navigate', { url: `${baseUrl}/app/drafts/${createdDraftId}` });
  await waitFor(cdp, `document.querySelector('textarea')?.value.includes(${JSON.stringify(initialContent)})`, 'draft editor');
  await evaluate(cdp, `{
    const textarea = document.querySelector('textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, ${JSON.stringify(savedContent)});
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    true;
  }`);
  await evaluate(cdp, `[...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Save draft').click(); true;`);
  await waitFor(cdp, `document.body.innerText.includes('v2') && document.querySelector('textarea')?.value === ${JSON.stringify(savedContent)}`, 'saved draft state');
  await cdp.send('Page.reload');
  await waitFor(cdp, `document.querySelector('textarea')?.value === ${JSON.stringify(savedContent)}`, 'saved draft after reload');
};

const main = async () => {
  const chrome = await launchChrome(cdpPort);
  const devServer = startDevServer(appRoot, webPort);
  try {
    await waitForHttp(`${baseUrl}/login`);
    const cdp = await openCdp(cdpPort);
    fillDraftApiMock(cdp);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/v1/*' }] });
    await runFlow(cdp);
    console.log(`edit draft -> save browser smoke passed (${createdDraftId})`);
  } finally {
    devServer.kill();
    await cleanupChrome(chrome);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
