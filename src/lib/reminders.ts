import { prisma } from '@/lib/prisma';
import { sendReminderSms, type SendResult } from '@/lib/stubs/sms';
import { completePastAppointments } from '@/lib/appointment-completion';
import { isEligibleForReminder } from '@/lib/reminder-eligibility';

const FORCE_WINDOW_HOURS = 7 * 24; // 7 days when force=true (demo override)

export type ReminderTickResult = {
  scanned: number;
  sent: number;
  skipped: number;
  failed: number;
  details: Array<{ appointmentId: string; result: SendResult['status']; message: string }>;
  completedPast: { completed: number; notified: number };
};

/**
 * One pass of the reminder cron (UC8). Scans for CONFIRMED appointments whose
 * `startsAt` falls inside the customer's `reminderHours` window (default 24h)
 * and have not yet been reminded — for each, calls the SMS stub which writes
 * a Notification + ReminderHistory row in one transaction.
 *
 * Idempotent — the unique `(appointmentId, channel)` index on ReminderHistory
 * means a re-tick after a successful send is a no-op for that appointment.
 *
 * Also runs `completePastAppointments` so the cron handles both UC4 (past →
 * COMPLETED + REVIEW_REQUEST) and UC8 (upcoming → REMINDER) on the same beat.
 *
 * `force=true` widens the window to 7 days and ignores `smsEnabled`, used by
 * the dev "Run now" button so demos don't have to wait for real time.
 */
export async function runReminderTick(
  options: { force?: boolean; now?: Date } = {},
): Promise<ReminderTickResult> {
  const now = options.now ?? new Date();
  const force = !!options.force;

  const completedPast = await completePastAppointments(now);

  // Two upper bounds: force-mode is a fixed wide window; normal mode uses the
  // largest possible per-customer setting (we re-check the actual window for
  // each row below). Using the larger bound keeps the SQL filter cheap.
  const windowMs = (force ? FORCE_WINDOW_HOURS : 168) * 60 * 60 * 1000;
  const upperBound = new Date(now.getTime() + windowMs);

  const candidates = await prisma.appointment.findMany({
    where: {
      status: 'CONFIRMED',
      startsAt: { gt: now, lte: upperBound },
      reminderHistories: { none: { channel: 'sms-stub', status: 'sent' } },
    },
    select: {
      id: true,
      startsAt: true,
      service: { select: { name: true } },
      professional: { select: { displayName: true } },
      customer: {
        select: {
          userId: true,
          user: { select: { notificationSettings: { select: { reminderHours: true, smsEnabled: true } } } },
        },
      },
    },
  });

  const result: ReminderTickResult = {
    scanned: candidates.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    details: [],
    completedPast,
  };

  for (const appt of candidates) {
    const settings = appt.customer.user.notificationSettings;
    const eligibility = isEligibleForReminder({
      startsAt: appt.startsAt,
      now,
      reminderHours: settings?.reminderHours,
      smsEnabled: settings?.smsEnabled,
      force,
    });
    if (!eligibility.ok) {
      result.skipped += 1;
      result.details.push({
        appointmentId: appt.id,
        result: 'skipped',
        message: eligibility.reason ?? 'INELIGIBLE',
      });
      continue;
    }

    const sendRes = await sendReminderSms({
      appointmentId: appt.id,
      customerUserId: appt.customer.userId,
      professionalName: appt.professional.displayName,
      serviceName: appt.service.name,
      startsAtIso: appt.startsAt.toISOString(),
    });

    if (sendRes.status === 'sent') result.sent += 1;
    else if (sendRes.status === 'skipped') result.skipped += 1;
    else result.failed += 1;

    result.details.push({
      appointmentId: appt.id,
      result: sendRes.status,
      message: sendRes.message,
    });
  }

  return result;
}
