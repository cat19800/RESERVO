import { describe, expect, it } from 'vitest';
import { canCancel } from '../../src/lib/cancellation';

const NOW = new Date('2026-06-01T10:00:00Z');

describe('canCancel', () => {
  it('allows a customer cancel well before the deadline', () => {
    const result = canCancel({
      appointment: { startsAt: new Date('2026-06-05T10:00:00Z'), status: 'CONFIRMED' },
      rules: { deadlineHours: 24 },
      actor: 'CUSTOMER',
      now: NOW,
    });
    expect(result.ok).toBe(true);
  });

  it('allows a customer cancel exactly at the deadline boundary', () => {
    // 24h before 2026-06-02T10:00 == 2026-06-01T10:00 == NOW. ok if now <= deadline.
    const result = canCancel({
      appointment: { startsAt: new Date('2026-06-02T10:00:00Z'), status: 'CONFIRMED' },
      rules: { deadlineHours: 24 },
      actor: 'CUSTOMER',
      now: NOW,
    });
    expect(result.ok).toBe(true);
  });

  it('blocks a customer cancel inside the deadline window', () => {
    // 23h before NOW → past the 24h deadline.
    const result = canCancel({
      appointment: { startsAt: new Date('2026-06-02T09:00:00Z'), status: 'CONFIRMED' },
      rules: { deadlineHours: 24 },
      actor: 'CUSTOMER',
      now: NOW,
    });
    expect(result).toEqual({ ok: false, reason: 'CANCEL_DEADLINE_PASSED' });
  });

  it("doesn't apply the deadline to professional cancellations", () => {
    const result = canCancel({
      appointment: { startsAt: new Date('2026-06-01T10:30:00Z'), status: 'CONFIRMED' },
      rules: { deadlineHours: 24 },
      actor: 'PROFESSIONAL',
      now: NOW,
    });
    expect(result.ok).toBe(true);
  });

  it('rejects non-CONFIRMED appointments regardless of actor', () => {
    for (const status of ['HELD', 'CANCELLED', 'COMPLETED'] as const) {
      expect(
        canCancel({
          appointment: { startsAt: new Date('2026-06-05T10:00:00Z'), status },
          rules: { deadlineHours: 24 },
          actor: 'PROFESSIONAL',
          now: NOW,
        }),
      ).toEqual({ ok: false, reason: 'NOT_CONFIRMED' });
    }
  });
});
