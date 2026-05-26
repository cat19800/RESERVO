const DEFAULT_REMINDER_HOURS = 24;

export type ReminderEligibilityInput = {
  startsAt: Date;
  now: Date;
  reminderHours: number | null | undefined;
  smsEnabled: boolean | null | undefined;
  force: boolean;
};

/**
 * Pure decision: should we send a reminder for this appointment right now?
 *
 * - Force mode bypasses both `smsEnabled` and per-customer `reminderHours`,
 *   firing for any future CONFIRMED appointment in the wide query window.
 * - Normal mode requires `smsEnabled !== false` and
 *   `startsAt - now <= reminderHours`.
 *
 * Past or already-started appointments are never eligible — those are the
 * completion sweep's job.
 *
 * Pure & DB-free so the unit tests can exercise boundary cases without
 * spinning up Postgres or mocking prisma.
 */
export function isEligibleForReminder(input: ReminderEligibilityInput): {
  ok: boolean;
  reason?: 'IN_PAST' | 'OUTSIDE_WINDOW' | 'SMS_DISABLED';
} {
  if (input.startsAt.getTime() <= input.now.getTime()) {
    return { ok: false, reason: 'IN_PAST' };
  }
  if (input.force) return { ok: true };
  if (input.smsEnabled === false) return { ok: false, reason: 'SMS_DISABLED' };
  const hours = input.reminderHours ?? DEFAULT_REMINDER_HOURS;
  const windowMs = hours * 60 * 60 * 1000;
  if (input.startsAt.getTime() - input.now.getTime() > windowMs) {
    return { ok: false, reason: 'OUTSIDE_WINDOW' };
  }
  return { ok: true };
}
