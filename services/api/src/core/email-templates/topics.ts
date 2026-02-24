// PATH: services/api/src/core/email-templates/topics.ts
// WHAT: Weekly topic proposal email template with one-click actions
// WHY:  Gives managers a compact inbox flow for approve/reject decisions
// RELEVANT: services/api/src/core/topics.ts,services/api/src/routes/webhooks-click-topic.ts

export interface TopicProposalEmailItem {
  title: string;
  description: string;
  approveLink: string;
  rejectLink: string;
}

export const weeklyTopicProposalsTemplate = (companyName: string, items: TopicProposalEmailItem[]) => {
  const fallback = 'На этой неделе предложений нет.';
  const lines = items.length === 0
    ? fallback
    : items.map((item, index) => `${index + 1}. ${item.title}\n${item.description}\nApprove: ${item.approveLink}\nReject: ${item.rejectLink}`).join('\n\n');
  const htmlList = items.length === 0
    ? `<p>${fallback}</p>`
    : `<ol>${items.map((item) => `<li><p><strong>${item.title}</strong></p><p>${item.description}</p><p><a href="${item.approveLink}">Approve</a> | <a href="${item.rejectLink}">Reject</a></p></li>`).join('')}</ol>`;

  return {
    subject: `Weekly topic proposals for ${companyName}`,
    textBody: `Weekly topic proposals:\n\n${lines}`,
    html: `<p>Weekly topic proposals for <strong>${companyName}</strong>:</p>${htmlList}`,
  };
};
