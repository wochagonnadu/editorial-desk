// PATH: services/api/src/core/topics.ts
// WHAT: Topic suggestion generation and weekly proposal delivery
// WHY:  Automates editorial planning with lightweight manager oversight
// RELEVANT: services/api/src/routes/cron.ts,services/api/src/core/email-templates/topics.ts

import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { ContentPort, EmailPort } from '@newsroom/shared';
import type { Database } from '../providers/db/index.js';
import {
  companyTable,
  expertTable,
  notificationTable,
  topicTable,
  userTable,
} from '../providers/db/index.js';
import { weeklyTopicProposalsTemplate } from './email-templates/topics.js';

export interface TopicSuggestion {
  title: string;
  description: string;
  source_type: 'faq' | 'myth' | 'seasonal' | 'service';
  expert_id?: string | null;
}

export const suggestTopics = async (
  content: ContentPort,
  input: {
    company: { domain: string; name: string };
    experts: Array<{ id: string; name: string; role_title: string; domain: string }>;
  },
): Promise<TopicSuggestion[]> => {
  const fallback = input.experts.slice(0, 4).map((expert, index) => ({
    title: `${expert.role_title}: practical topic ${index + 1}`,
    description: `Weekly topic for ${input.company.domain} audience with clear action points from ${expert.name}.`,
    source_type: 'service' as const,
    expert_id: expert.id,
  }));

  try {
    const result = await content.generateObject<{ topics: TopicSuggestion[] }>({
      meta: {
        useCase: 'topics.suggest',
        promptId: 'topics.suggest.weekly',
        promptVersion: '1.0.0',
      },
      promptVars: {
        company_name: input.company.name,
        company_domain: input.company.domain,
        experts_json: JSON.stringify(input.experts),
      },
      schema: { type: 'object', properties: { topics: { type: 'array' } }, required: ['topics'] },
    });
    return (Array.isArray(result.topics) && result.topics.length > 0 ? result.topics : fallback)
      .map((item) => ({
        ...item,
        title: String(item.title ?? '').trim(),
        description: String(item.description ?? '').trim(),
      }))
      .filter((item) => item.title.length > 3)
      .slice(0, 6);
  } catch {
    return fallback;
  }
};

export const sendWeeklyProposals = async (
  deps: { db: Database; email: EmailPort; content: ContentPort },
  companyId: string,
): Promise<number> => {
  const [company] = await deps.db
    .select()
    .from(companyTable)
    .where(eq(companyTable.id, companyId))
    .limit(1);
  if (!company) return 0;

  const experts = await deps.db
    .select()
    .from(expertTable)
    .where(and(eq(expertTable.companyId, companyId), eq(expertTable.status, 'active')));
  const managers = await deps.db.select().from(userTable).where(eq(userTable.companyId, companyId));
  if (managers.length === 0) return 0;

  const suggested = await suggestTopics(deps.content, {
    company: { domain: company.domain, name: company.name },
    experts: experts.map((item) => ({
      id: item.id,
      name: item.name,
      role_title: item.roleTitle,
      domain: item.domain,
    })),
  });

  const inserted = await deps.db
    .insert(topicTable)
    .values(
      suggested.map((item) => ({
        companyId,
        expertId: item.expert_id ?? null,
        title: item.title,
        description: item.description,
        sourceType: item.source_type,
        status: 'proposed',
        proposedBy: 'system',
      })),
    )
    .returning();

  const baseUrl = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  for (const manager of managers) {
    const emailItems = [];
    for (const topic of inserted) {
      const token = randomUUID();
      await deps.db.insert(notificationTable).values({
        companyId,
        recipientEmail: manager.email,
        notificationType: 'topic_proposal',
        referenceType: 'topic',
        referenceId: topic.id,
        emailToken: token,
        status: 'sent',
        sentAt: new Date(),
      } as unknown as typeof notificationTable.$inferInsert);
      emailItems.push({
        title: topic.title,
        description: topic.description ?? 'No description',
        approveLink: `${baseUrl}/api/v1/webhooks/email/click?action=topic_approve&topic=${topic.id}&token=${token}`,
        rejectLink: `${baseUrl}/api/v1/webhooks/email/click?action=topic_reject&topic=${topic.id}&token=${token}`,
      });
    }
    const message = weeklyTopicProposalsTemplate(company.name, emailItems);
    await deps.email.sendEmail({
      to: manager.email,
      subject: message.subject,
      html: message.html,
      textBody: message.textBody,
    });
  }

  return inserted.length;
};
