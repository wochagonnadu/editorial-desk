// PATH: apps/web/scripts/smoke-create-topic-draft-editor.mjs
// WHAT: Browser smoke test for strategy topic to draft editor flow
// WHY:  Verifies the main content creation UI path without real API or DB access
// RELEVANT: apps/web/scripts/smoke-cdp.mjs,apps/web/src/pages/CreateDraft.tsx,apps/web/src/pages/DraftEditor.tsx,TESTING_PLAN.md

import { resolve } from 'node:path';
import { cleanupChrome, evaluate, launchChrome, openCdp, startDevServer, waitFor, waitForHttp } from './smoke-cdp.mjs';
import { fillCreateTopicApiMock } from './smoke-create-topic-api-mock.mjs';
import { copiedTopicTitle, createdDraftId } from './smoke-create-topic-fixtures.mjs';

const appRoot = resolve(import.meta.dirname, '..');
const webPort = Number(process.env.SMOKE_WEB_PORT || 5173);
const cdpPort = Number(process.env.SMOKE_CDP_PORT || 9223);
const baseUrl = `http://127.0.0.1:${webPort}`;

const setInputValue = (cdp, selector, value) =>
  evaluate(
    cdp,
    `{
      const input = document.querySelector(${JSON.stringify(selector)});
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      true;
    }`,
  );

const selectExpert = (cdp) =>
  evaluate(
    cdp,
    `{
      const select = document.querySelector('select');
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, 'expert-1');
      select.dispatchEvent(new Event('change', { bubbles: true }));
      true;
    }`,
  );

const clickButton = (cdp, text) =>
  evaluate(
    cdp,
    `[...document.querySelectorAll('button')].find((button)=>button.textContent.trim()===${JSON.stringify(text)}).click(); true;`,
  );

const runFlow = async (cdp) => {
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.setItem('editorialdesk.session', ${JSON.stringify(
      JSON.stringify({
        token: 'session-token',
        user: { id: 'user-1', email: 'smoke@local.test', role: 'owner', companyId: 'company-1' },
      }),
    )});`,
  });
  await cdp.send('Page.navigate', { url: `${baseUrl}/app/drafts/new` });
  await waitFor(cdp, "document.body.innerText.includes('Create Draft')", 'create draft page');
  await waitFor(cdp, "document.querySelectorAll('select option').length > 1", 'expert options');

  await selectExpert(cdp);
  await setInputValue(cdp, 'input[placeholder="Topic title (min 3 chars)"]', 'clinic patient prep');
  await clickButton(cdp, 'Generate Content Plan');
  await waitFor(cdp, `document.body.innerText.includes(${JSON.stringify(copiedTopicTitle)})`, 'strategy plan');
  await clickButton(cdp, 'Copy cluster');
  await waitFor(cdp, "document.body.innerText.includes('proposed')", 'copied topic');
  await clickButton(cdp, 'Start draft');
  await waitFor(cdp, `location.pathname === '/app/drafts/${createdDraftId}'`, 'draft editor route');
  await waitFor(
    cdp,
    `document.body.innerText.includes(${JSON.stringify(copiedTopicTitle)}) && Boolean(document.querySelector('textarea'))`,
    'draft editor content',
  );
};

const main = async () => {
  const chrome = await launchChrome(cdpPort);
  const devServer = startDevServer(appRoot, webPort);
  try {
    await waitForHttp(`${baseUrl}/login`);
    const cdp = await openCdp(cdpPort);
    fillCreateTopicApiMock(cdp);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/v1/*' }] });
    await runFlow(cdp);
    console.log(`create topic -> draft editor browser smoke passed (${createdDraftId})`);
  } finally {
    devServer.kill();
    await cleanupChrome(chrome);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
