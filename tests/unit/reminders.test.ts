import { describe, expect, it } from 'vitest';
import { isEligibleForReminder } from '../../src/lib/reminder-eligibility';

const NOW = new Date('2026-06-01T10:00:00Z');

describe('isEligibleForReminder', () => {
  it('skips past or now appointments', () => {
    const r = isEligibleForReminder({
      startsAt: new Date('2026-06-01T09:59:59Z'),
      now: NOW,
      reminderHours: 24,
      smsEnabled: true,
      force: false,
    });
    expect(r).toEqual({ ok: false, reason: 'IN_PAST' });
  });

  it('skips appointments outside the customer reminderHours window', () => {
    // 48h ahead, customer prefers 24h reminders → too far away
    const r = isEligibleForReminder({
      startsAt: new Date('2026-06-03T10:00:00Z'),
      now: NOW,
      reminderHours: 24,
      smsEnabled: true,
      force: false,
    });
    expect(r).toEqual({ ok: false, reason: 'OUTSIDE_WINDOW' });
  });

  it('fires exactly at the customer reminderHours boundary', () => {
    const r = isEligibleForReminder({
      startsAt: new Date('2026-06-02T10:00:00Z'), // exactly 24h
      now: NOW,
      reminderHours: 24,
      smsEnabled: true,
      force: false,
    });
    expect(r.ok).toBe(true);
  });

  it('respects smsEnabled=false in normal mode', () => {
    const r = isEligibleForReminder({
      startsAt: new Date('2026-06-01T18:00:00Z'),
      now: NOW,
      reminderHours: 24,
      smsEnabled: false,
      force: false,
    });
    expect(r).toEqual({ ok: false, reason: 'SMS_DISABLED' });
  });

  it('falls back to default 24h when reminderHours is null', () => {
    // 25h out → outside default 24h window
    const r = isEligibleForReminder({
      startsAt: new Date('2026-06-02T11:00:00Z'),
      now: NOW,
      reminderHours: null,
      smsEnabled: true,
      force: false,
    });
    expect(r).toEqual({ ok: false, reason: 'OUTSIDE_WINDOW' });
  });

  it('honors a wider reminderHours setting (48h)', () => {
    const r = isEligibleForReminder({
      startsAt: new Date('2026-06-03T09:00:00Z'), // 47h ahead
      now: NOW,
      reminderHours: 48,
      smsEnabled: true,
      force: false,
    });
    expect(r.ok).toBe(true);
  });

  it('force mode bypasses smsEnabled=false', () => {
    const r = isEligibleForReminder({
      startsAt: new Date('2026-06-01T18:00:00Z'),
      now: NOW,
      reminderHours: 24,
      smsEnabled: false,
      force: true,
    });
    expect(r.ok).toBe(true);
  });

  it('force mode bypasses the reminderHours window', () => {
    const r = isEligibleForReminder({
      startsAt: new Date('2026-06-05T10:00:00Z'), // 4 days out
      now: NOW,
      reminderHours: 24,
      smsEnabled: true,
      force: true,
    });
    expect(r.ok).toBe(true);
  });

  it('force mode still skips past appointments', () => {
    const r = isEligibleForReminder({
      startsAt: new Date('2026-06-01T09:00:00Z'),
      now: NOW,
      reminderHours: 24,
      smsEnabled: true,
      force: true,
    });
    expect(r).toEqual({ ok: false, reason: 'IN_PAST' });
  });
});
