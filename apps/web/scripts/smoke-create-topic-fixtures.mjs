// PATH: apps/web/scripts/smoke-create-topic-fixtures.mjs
// WHAT: Fixture responses for create-topic browser smoke API mock
// WHY:  Keeps route mock compact while preserving realistic DTO shapes
// RELEVANT: apps/web/scripts/smoke-create-topic-api-mock.mjs,apps/web/src/services/topics.ts,apps/web/src/services/drafts.ts

export const createdDraftId = 'draft-smoke-1';
export const copiedTopicTitle = 'Patient prep checklist';

export const expert = {
  id: 'expert-1',
  name: 'Dr. Rowan Lee',
  role_title: 'Clinical lead',
  email: 'rowan@example.test',
  status: 'active',
  onboarding_progress: 5,
  voice_profile_status: 'confirmed',
};

const now = () => new Date().toISOString();
const draftContent = '# Patient prep checklist\n\nBring questions and recent notes.';

export const strategyPlanResponse = (topicSeed) => ({
  plan: {
    horizon_weeks: 12,
    pillars: [
      {
        pillar_id: 'pillar-1',
        title: 'Pre-visit education',
        goal: 'Turn common prep questions into practical articles.',
        clusters: [
          {
            item_id: 'cluster-1',
            week: 1,
            title: copiedTopicTitle,
            angle: 'Help patients prepare before their appointment.',
            target_keyword: 'patient prep checklist',
            interlink_to: [],
            copy_payload: {
              title: copiedTopicTitle,
              description: 'Practical appointment prep checklist.',
              source_type: 'strategy_cluster',
              expert_id: expert.id,
            },
          },
        ],
        faq: [],
      },
    ],
    interlinking: [],
  },
  input_snapshot: {
    expert: { id: expert.id, name: expert.name },
    topic_seed: topicSeed,
    audience: 'general',
    market: 'en-US',
    constraints: { tone: 'practical and calm', max_items_per_week: 2 },
    generated_at: now(),
  },
});

export const draftDetailResponse = () => ({
  id: createdDraftId,
  status: 'drafting',
  topic: { title: copiedTopicTitle },
  expert: { id: expert.id, name: expert.name },
  current_version: {
    id: 'version-smoke-1',
    version_number: 1,
    content: draftContent,
    summary: 'Initial smoke draft',
  },
  factcheck_report: null,
  publish_plan: { scheduled_publish_at: null, timezone: null, is_scheduled: false },
  comments: [],
});

export const draftVersionsResponse = () => ({
  data: [
    {
      id: 'version-smoke-1',
      version_number: 1,
      summary: 'Initial smoke draft',
      content: draftContent,
      created_at: now(),
    },
  ],
});
