// PATH: services/api/src/core/email-templates/approval.ts
// WHAT: Templates for approval request, reminder, and feedback summary emails
// WHY:  Keeps approval communication consistent and easy to evolve
// RELEVANT: services/api/src/core/approval.ts,services/api/src/routes/webhooks.ts

export interface ApprovalTemplate {
  subject: string;
  textBody: string;
  html: string;
}

interface RequestInput {
  appUrl: string;
  draftId: string;
  token: string;
  version: number;
  baseVersion?: number | null;
  title: string;
  summary: string;
  changes?: string[];
}

const buildActionLink = (
  appUrl: string,
  draftId: string,
  token: string,
  version: number,
  action: 'approve' | 'request_changes',
) => {
  return `${appUrl.replace(/\/$/, '')}/api/v1/webhooks/email/click?action=${action}&draft=${draftId}&token=${token}&version=${version}`;
};

export const approvalRequestTemplate = (input: RequestInput): ApprovalTemplate => {
  const approveLink = buildActionLink(
    input.appUrl,
    input.draftId,
    input.token,
    input.version,
    'approve',
  );
  const changesLink = buildActionLink(
    input.appUrl,
    input.draftId,
    input.token,
    input.version,
    'request_changes',
  );
  const highlights = (input.changes ?? []).filter(Boolean).slice(0, 5);
  const comparedVersions = input.baseVersion
    ? `Compared versions: v${input.baseVersion} -> v${input.version}`
    : `Compared versions: initial -> v${input.version}`;
  const changesTextBlock =
    highlights.length > 0
      ? `\n\nWhat changed (base to current):\n- ${comparedVersions}\n${highlights.map((item) => `- ${item}`).join('\n')}`
      : `\n\nWhat changed (base to current):\n- ${comparedVersions}`;
  const changesHtmlBlock = `<p><strong>What changed (base to current)</strong></p><ul><li>${comparedVersions}</li>${highlights.map((item) => `<li>${item}</li>`).join('')}</ul>`;
  return {
    subject: `Approval requested: ${input.title}`,
    textBody: `Draft: ${input.title}\n\n${input.summary}${changesTextBlock}\n\nApprove: ${approveLink}\nRequest changes: ${changesLink}`,
    html: `<p><strong>${input.title}</strong></p><p>${input.summary}</p>${changesHtmlBlock}<p><a href="${approveLink}">Approve</a> | <a href="${changesLink}">Request changes</a></p>`,
  };
};

export const reminderTemplate = (title: string, deadlineAt: Date): ApprovalTemplate => {
  const deadline = deadlineAt.toISOString();
  return {
    subject: `Reminder: approval pending for ${title}`,
    textBody: `Approval is still pending for "${title}". Deadline: ${deadline}.`,
    html: `<p>Approval is still pending for <strong>${title}</strong>.</p><p>Deadline: ${deadline}</p>`,
  };
};

export const consolidatedFeedbackTemplate = (
  title: string,
  feedback: string[],
): ApprovalTemplate => {
  const list =
    feedback.length > 0 ? feedback.map((item) => `- ${item}`).join('\n') : '- No details provided';
  return {
    subject: `Consolidated feedback: ${title}`,
    textBody: `All approvers requested changes for "${title}":\n${list}`,
    html: `<p>All approvers requested changes for <strong>${title}</strong>:</p><ul>${feedback.map((item) => `<li>${item}</li>`).join('')}</ul>`,
  };
};
