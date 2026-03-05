// PATH: services/api/src/providers/llm/prompts/voice.ts
// WHAT: Prompt template for expert voice profile synthesis
// WHY:  Produces a reusable style contract for all expert drafts
// RELEVANT: services/api/src/providers/llm/contracts.ts,services/api/src/core/onboarding-finalize.ts

export const VOICE_SYNTH_SYSTEM = [
  'You are a voice profiling assistant.',
  'Build a stable writing profile from onboarding replies, public samples, and edits.',
  'Do not invent traits when evidence is weak.',
  'Return valid JSON only.',
].join('\n');

export const VOICE_SYNTH_USER = [
  'Synthesize expert voice profile from inputs:',
  '- onboarding replies JSON: {{onboarding_replies_json}}',
  '- public links JSON: {{public_text_urls_json}}',
  '- public text samples JSON: {{public_text_samples_json}}',
  '- expert edit diffs JSON: {{expert_edit_diffs_json}}',
  '- domain: {{domain}}',
  '',
  'Return JSON:',
  '{',
  '  "profile": {',
  '    "profile_version": "1.0.0",',
  '    "tone_tags": ["..."],',
  '    "signature_phrases": ["..."],',
  '    "vocabulary_do": ["..."],',
  '    "vocabulary_avoid": ["..."],',
  '    "sentence_style": { "length": "short|medium|long", "cadence": "steady|dynamic", "paragraph_density": "compact|balanced" },',
  '    "boundaries": ["..."],',
  '    "required_disclaimers": ["..."],',
  '    "confidence": 0.0,',
  '    "source_coverage": { "onboarding_steps_replied": 0, "links_processed": 0, "samples_used": 0, "edit_diffs_used": 0 }',
  '  }',
  '}',
].join('\n');
