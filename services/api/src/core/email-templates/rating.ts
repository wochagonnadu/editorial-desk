// PATH: services/api/src/core/email-templates/rating.ts
// WHAT: Voice fidelity rating email template
// WHY:  Captures expert 1-10 score after voice test draft, should be with text example
// RELEVANT: services/api/src/core/voice.ts,services/api/src/routes/drafts.ts

const MAX_EMAIL_DRAFT_PREVIEW = 1500;

const clip = (value: string): string => {
  const normalized = value.trim();
  if (normalized.length <= MAX_EMAIL_DRAFT_PREVIEW) return normalized;
  return `${normalized.slice(0, MAX_EMAIL_DRAFT_PREVIEW)}...`;
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export const buildRatingTemplate = (
  expertName: string,
  draftId: string,
  token: string,
  appUrl: string,
  draftContent: string,
) => {
  const base = appUrl.replace(/\/$/, '');
  const links = Array.from({ length: 10 }, (_, i) => {
    const score = i + 1;
    const href = `${base}/api/v1/drafts/${draftId}/voice-rating?token=${encodeURIComponent(token)}&score=${score}`;
    return `<a href="${href}">${score}</a>`;
  });
  const preview = clip(draftContent);

  return {
    subject: 'Rate voice fidelity (1-10)',
    textBody:
      `Hi ${expertName}, please rate how close this text is to your voice (1-10).\n\n` +
      `Voice test draft:\n${preview}\n\n` +
      `Rate voice fidelity: ${Array.from({ length: 10 }, (_, i) => i + 1).join(' | ')}`,
    html:
      `<p>Hi ${expertName}, please rate how close this text is to your voice (1-10):</p>` +
      `<p><strong>Voice test draft</strong></p>` +
      `<blockquote style="margin:12px 0;padding:12px;border-left:3px solid #d2d2d2;white-space:pre-wrap;">${escapeHtml(preview)}</blockquote>` +
      `<p>${links.join(' | ')}</p>`,
  };
};
