// PATH: services/api/src/core/email-templates/digest.ts
// WHAT: Monthly owner digest email template
// WHY:  Summarizes editorial output and delays in one message
// RELEVANT: services/api/src/core/reports.ts,services/api/src/routes/cron-digest.ts

interface DelayItem {
  expert: string;
  draft_title: string;
  days_delayed: number;
}

export const monthlyDigestTemplate = (input: {
  period: string;
  drafts_created: number;
  drafts_approved: number;
  drafts_pending: number;
  avg_approval_days: number;
  delays: DelayItem[];
}) => {
  const delays = input.delays.length === 0
    ? 'No notable delays.'
    : input.delays.map((item) => `- ${item.expert}: ${item.draft_title} (${item.days_delayed} days)`).join('\n');

  return {
    subject: `Monthly editorial digest: ${input.period}`,
    textBody: `Created: ${input.drafts_created}\nApproved: ${input.drafts_approved}\nPending: ${input.drafts_pending}\nAvg approval days: ${input.avg_approval_days}\n\nDelays:\n${delays}`,
    html: `<p><strong>Period:</strong> ${input.period}</p><p>Created: ${input.drafts_created}<br/>Approved: ${input.drafts_approved}<br/>Pending: ${input.drafts_pending}<br/>Avg approval days: ${input.avg_approval_days}</p><pre>${delays}</pre>`,
  };
};
