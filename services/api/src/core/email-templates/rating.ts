// PATH: services/api/src/core/email-templates/rating.ts
// WHAT: Voice fidelity rating email template
// WHY:  Captures expert 1-10 score after voice test draft
// RELEVANT: services/api/src/core/voice.ts,services/api/src/routes/drafts.ts

export const buildRatingTemplate = (expertName: string, draftId: string, token: string, appUrl: string) => {
  const base = appUrl.replace(/\/$/, '');
  const links = Array.from({ length: 10 }, (_, i) => {
    const score = i + 1;
    const href = `${base}/api/v1/drafts/${draftId}/voice-rating?token=${encodeURIComponent(token)}&score=${score}`;
    return `<a href="${href}">${score}</a>`;
  });

  return {
    subject: 'Rate voice fidelity (1-10)',
    textBody: `Hi ${expertName}, rate voice fidelity from 1 to 10 using the provided links.`,
    html: `<p>Hi ${expertName}, rate voice fidelity from 1 to 10:</p><p>${links.join(' | ')}</p>`,
  };
};
