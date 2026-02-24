// PATH: services/api/tests/unit/voice.test.ts
// WHAT: Unit tests for voice profile and scoring helpers
// WHY:  Protects voice fidelity behavior from regressions
// RELEVANT: services/api/src/core/voice.ts,services/api/tests/integration/content-cycle.test.ts

import { buildVoiceProfile, calculateVoiceScore, generateVoiceTest } from '../../src/core/voice';

describe('voice core', () => {
  it('builds profile and generates voice test text', () => {
    const profile = buildVoiceProfile([
      'calm practical structured explanations for patient questions',
      'clear phrases and examples in each answer',
    ]);

    expect(Array.isArray(profile.descriptive_words)).toBe(true);
    const sample = generateVoiceTest(profile);
    expect(sample).toContain('Voice test draft');
  });

  it('gives higher score when signature phrases are present', () => {
    const profile = {
      signature_phrases: ['structured guidance', 'next steps'],
      descriptive_words: ['calm', 'practical'],
    };

    const withMatches = calculateVoiceScore(profile, 'This text provides structured guidance and explicit next steps.');
    const withoutMatches = calculateVoiceScore(profile, 'Generic text with no specific phrase.');

    expect(withMatches).toBeGreaterThan(withoutMatches);
    expect(withMatches).toBeLessThanOrEqual(1);
    expect(withoutMatches).toBeGreaterThanOrEqual(0.1);
  });
});
