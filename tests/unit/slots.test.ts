import { describe, expect, it } from 'vitest';
import { generateSlots } from '../../src/lib/slots';

const ATHENS = 'Europe/Athens';

// Helpers: build a Date in Athens wall-clock terms via a UTC offset.
function utcAt(iso: string): Date {
  return new Date(iso);
}

describe('generateSlots', () => {
  it('returns no slots when working hours is empty', () => {
    const slots = generateSlots({
      workingHours: [],
      blockedPeriods: [],
      slotGranularityMinutes: 30,
      bufferMinutes: 0,
      serviceDurationMinutes: 30,
      fromDate: utcAt('2026-06-01T00:00:00Z'),
      toDate: utcAt('2026-06-08T00:00:00Z'),
      tz: ATHENS,
    });
    expect(slots).toHaveLength(0);
  });

  it('produces 16 slots for an 8-hour Monday block at 30-min granularity & 30-min service', () => {
    // 2026-06-01 is a Monday in Athens.
    const slots = generateSlots({
      workingHours: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
      blockedPeriods: [],
      slotGranularityMinutes: 30,
      bufferMinutes: 0,
      serviceDurationMinutes: 30,
      fromDate: utcAt('2026-06-01T00:00:00Z'),
      toDate: utcAt('2026-06-02T00:00:00Z'),
      tz: ATHENS,
    });
    expect(slots).toHaveLength(16);
    // First slot starts at 09:00 Athens = 06:00 UTC (summer, EEST = UTC+3).
    expect(slots[0].startsAt.toISOString()).toBe('2026-06-01T06:00:00.000Z');
    expect(slots[0].endsAt.toISOString()).toBe('2026-06-01T06:30:00.000Z');
  });

  it('honours slot granularity smaller than service duration', () => {
    // 8h block, 30min service, 15min granularity.
    // Last valid start: cursor + 30 ≤ 480 ⇒ cursor ∈ {0,15,…,450}, 31 starts.
    const slots = generateSlots({
      workingHours: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
      blockedPeriods: [],
      slotGranularityMinutes: 15,
      bufferMinutes: 0,
      serviceDurationMinutes: 30,
      fromDate: utcAt('2026-06-01T00:00:00Z'),
      toDate: utcAt('2026-06-02T00:00:00Z'),
      tz: ATHENS,
    });
    expect(slots).toHaveLength(31);
  });

  it('respects buffer between slots', () => {
    // 60-min service + 15-min buffer, 30-min granularity, 8h block.
    // Last valid cursor: cursor + 60 + 15 ≤ 480 ⇒ cursor ≤ 405 ⇒ {0,30,60,…,390}.
    // That's 14 candidate cursor positions.
    const slots = generateSlots({
      workingHours: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
      blockedPeriods: [],
      slotGranularityMinutes: 30,
      bufferMinutes: 15,
      serviceDurationMinutes: 60,
      fromDate: utcAt('2026-06-01T00:00:00Z'),
      toDate: utcAt('2026-06-02T00:00:00Z'),
      tz: ATHENS,
    });
    expect(slots).toHaveLength(14);
  });

  it('excludes slots that overlap a blocked period', () => {
    const slots = generateSlots({
      workingHours: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
      blockedPeriods: [
        // 12:00–13:00 Athens = 09:00–10:00 UTC blocked.
        { startsAt: utcAt('2026-06-01T09:00:00Z'), endsAt: utcAt('2026-06-01T10:00:00Z') },
      ],
      slotGranularityMinutes: 30,
      bufferMinutes: 0,
      serviceDurationMinutes: 30,
      fromDate: utcAt('2026-06-01T00:00:00Z'),
      toDate: utcAt('2026-06-02T00:00:00Z'),
      tz: ATHENS,
    });
    // 16 normal slots minus 2 (12:00 and 12:30) that overlap = 14.
    expect(slots).toHaveLength(14);
    // Verify no slot overlaps the blocked window.
    const blockStart = utcAt('2026-06-01T09:00:00Z').getTime();
    const blockEnd = utcAt('2026-06-01T10:00:00Z').getTime();
    for (const s of slots) {
      const overlap = s.startsAt.getTime() < blockEnd && s.endsAt.getTime() > blockStart;
      expect(overlap).toBe(false);
    }
  });

  it('returns no slots when service is longer than the block', () => {
    const slots = generateSlots({
      workingHours: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }],
      blockedPeriods: [],
      slotGranularityMinutes: 30,
      bufferMinutes: 0,
      serviceDurationMinutes: 90,
      fromDate: utcAt('2026-06-01T00:00:00Z'),
      toDate: utcAt('2026-06-02T00:00:00Z'),
      tz: ATHENS,
    });
    expect(slots).toHaveLength(0);
  });

  it('iterates by Athens calendar days, not UTC days', () => {
    // Mon-Fri 09:00–10:00 Athens ⇒ 2 slots/day @ 30-min granularity.
    // Range covers Mon-Sun (2026-06-01..-08), 5 working days × 2 = 10 slots.
    const slots = generateSlots({
      workingHours: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
        { dayOfWeek: 2, startTime: '09:00', endTime: '10:00' },
        { dayOfWeek: 3, startTime: '09:00', endTime: '10:00' },
        { dayOfWeek: 4, startTime: '09:00', endTime: '10:00' },
        { dayOfWeek: 5, startTime: '09:00', endTime: '10:00' },
      ],
      blockedPeriods: [],
      slotGranularityMinutes: 30,
      bufferMinutes: 0,
      serviceDurationMinutes: 30,
      fromDate: utcAt('2026-06-01T00:00:00Z'),
      toDate: utcAt('2026-06-08T00:00:00Z'),
      tz: ATHENS,
    });
    expect(slots).toHaveLength(10);
  });

  it('handles DST spring-forward (last Sunday of March in Athens)', () => {
    // 2026-03-29 is the spring DST transition in Athens (EET → EEST, +2 → +3).
    // Working hours 09:00–17:00 on Sunday (dayOfWeek=0).
    // The local clock skips 03:00 → 04:00, but since we offer 09:00 onwards,
    // the block should still produce slots normally, anchored to local time.
    const slots = generateSlots({
      workingHours: [{ dayOfWeek: 0, startTime: '09:00', endTime: '17:00' }],
      blockedPeriods: [],
      slotGranularityMinutes: 30,
      bufferMinutes: 0,
      serviceDurationMinutes: 30,
      fromDate: utcAt('2026-03-29T00:00:00Z'),
      toDate: utcAt('2026-03-30T00:00:00Z'),
      tz: ATHENS,
    });
    expect(slots).toHaveLength(16);
    // 09:00 Athens after DST is 06:00 UTC (EEST is UTC+3).
    expect(slots[0].startsAt.toISOString()).toBe('2026-03-29T06:00:00.000Z');
  });
});
