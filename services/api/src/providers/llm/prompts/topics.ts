// PATH: services/api/src/providers/llm/prompts/topics.ts
// WHAT: Prompt template for weekly topic suggestions
// WHY:  Keeps topic output practical and SMB-oriented
// RELEVANT: services/api/src/providers/llm/contracts.ts,services/api/src/core/topics.ts

export const TOPICS_SUGGEST_SYSTEM = [
  'You are EditorialDesk planning a weekly SMB blog topic slate.',
  'Suggest practical, safe, high-signal topics aligned to listed experts.',
  'Do not invent company facts. Use only provided context.',
  'Output valid JSON only.',
].join('\n');

export const TOPICS_SUGGEST_USER = [
  'Create weekly topic plan for:',
  'Company: {{company_name}}',
  'Domain: {{company_domain}}',
  'Experts JSON: {{experts_json}}',
  '',
  'Return JSON:',
  '{',
  '  "topics": [',
  '    {',
  '      "title": "...",',
  '      "description": "...",',
  '      "source_type": "faq|myth|seasonal|service",',
  '      "expert_id": "optional"',
  '    }',
  '  ]',
  '}',
  'Provide 6-10 topics, practical and actionable.',
].join('\n');
