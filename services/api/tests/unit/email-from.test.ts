// PATH: services/api/tests/unit/email-from.test.ts
// WHAT: Unit tests for final From header composition
// WHY:  Keeps manager display-name override from mutating the canonical sender address
// RELEVANT: services/api/src/providers/email-from.ts,services/api/src/providers/email-resend.ts,.env.example

import { describe, expect, it } from 'vitest';
import { buildEmailFrom } from '../../src/providers/email-from';

describe('email from builder', () => {
  it('keeps original EMAIL_FROM when sender name is absent', () => {
    expect(buildEmailFrom('Editorial Desk <no-reply@example.com>')).toBe(
      'Editorial Desk <no-reply@example.com>',
    );
  });

  it('reuses EMAIL_FROM address and swaps only display name', () => {
    expect(buildEmailFrom('Editorial Desk <no-reply@example.com>', 'Anna Manager')).toBe(
      'Anna Manager <no-reply@example.com>',
    );
  });

  it('supports plain email EMAIL_FROM values', () => {
    expect(buildEmailFrom('no-reply@example.com', 'Anna Manager')).toBe(
      'Anna Manager <no-reply@example.com>',
    );
  });
});
