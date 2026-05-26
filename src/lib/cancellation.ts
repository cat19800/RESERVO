import { type AppointmentStatus } from '@generated/client';

export type CanCancelInput = {
  appointment: { startsAt: Date; status: AppointmentStatus | string };
  rules: { deadlineHours: number };
  now?: Date;
  /**
   * Pros may cancel their own bookings outside the customer-facing deadline
   * (e.g. UC5 alt-flow 1 — schedule conflict). Customers are subject to the
   * deadline. The caller passes the actor.
   */
  actor: 'CUSTOMER' | 'PROFESSIONAL' | 'SYSTEM';
};

export type CanCancelResult =
  | { ok: true }
  | { ok: false; reason: 'NOT_CONFIRMED' | 'CANCEL_DEADLINE_PASSED' };

export function canCancel({
  appointment,
  rules,
  actor,
  now = new Date(),
}: CanCancelInput): CanCancelResult {
  if (appointment.status !== 'CONFIRMED') {
    return { ok: false, reason: 'NOT_CONFIRMED' };
  }
  if (actor === 'CUSTOMER') {
    const deadlineMs =
      appointment.startsAt.getTime() - rules.deadlineHours * 60 * 60 * 1000;
    if (now.getTime() > deadlineMs) {
      return { ok: false, reason: 'CANCEL_DEADLINE_PASSED' };
    }
  }
  return { ok: true };
}

/** Reschedule uses the same gate as cancellation (UC2). */
export const canReschedule = canCancel;
