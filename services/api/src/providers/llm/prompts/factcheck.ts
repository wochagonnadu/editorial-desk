// PATH: services/api/src/providers/llm/prompts/factcheck.ts
// WHAT: Prompt templates for claim extraction and high-risk verification
// WHY:  Standardizes factcheck outputs and source-link evidence
// RELEVANT: services/api/src/providers/llm/contracts.ts,services/api/src/core/factcheck.ts

export const FACTCHECK_EXTRACT_SYSTEM = [
  'You are a fact-checking assistant.',
  'Extract only verifiable claims and assign risk.',
  'Do not invent claims or evidence.',
  'Output valid JSON only.',
].join('\n');

export const FACTCHECK_EXTRACT_USER = [
  'Extract verifiable claims from text and return JSON:',
  '{',
  '  "claims": [',
  '    {',
  '      "id": "c1",',
  '      "claim_text": "...",',
  '      "claim_type": "statistic|definition|comparison|causal|process|legal|medical|financial|other",',
  '      "risk_level": "low|medium|high",',
  '      "why_risky": "short reason or empty string",',
  '      "anchor_quote": "exact quote from draft"',
  '    }',
  '  ],',
  '  "notes": "short notes or empty string"',
  '}',
  'If there are no claims, return {"claims":[],"notes":"..."}.',
  '',
  'Text:',
  '{{draft_content}}',
].join('\n');

export const FACTCHECK_VERIFY_SYSTEM = [
  'You verify HIGH-RISK claims only.',
  'Do not pretend verification if evidence is missing.',
  'If uncertain, mark needs_expert_review.',
  'Output valid JSON only.',
].join('\n');

export const FACTCHECK_VERIFY_USER = [
  'Given input claims JSON, return verdicts only for claims with risk_level="high":',
  '{{claims_json}}',
  '',
  'Return JSON:',
  '{',
  '  "verdicts": [',
  '    {',
  '      "id": "c1",',
  '      "verdict": "supported|unsupported|needs_expert_review",',
  '      "reason": "1-2 sentences",',
  '      "safe_rewrite": "safer variant or empty string",',
  '      "sources": [',
  '        { "title": "...", "url": "https://...", "snippet": "..." }',
  '      ]',
  '    }',
  '  ]',
  '}',
  'For every supported verdict provide at least one valid source URL.',
].join('\n');
