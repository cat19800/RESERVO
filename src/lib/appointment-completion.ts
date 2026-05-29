import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

/**
 * Sweep CONFIRMED appointments whose end has passed → mark COMPLETED.
 *
 * Each completed appointment also emits a REVIEW_REQUEST notification to the
 * customer. Idempotent: re-running scans for fresh CONFIRMED/past rows only.
 *
 * Called from Phase 8's dev endpoint; Phase 10's node-cron will trigger this
 * automatically every minute.
 */
export async function completePastAppointments(now: Date = new Date()): Promise<{
  completed: number;
  notified: number;
}> {
  const due = await prisma.appointment.findMany({
    where: { status: 'CONFIRMED', endsAt: { lt: now } },
    select: {
      id: true,
      customer: { select: { userId: true } },
      professional: { select: { displayName: true } },
      service: { select: { name: true } },
    },
  });

  let completed = 0;
  let notified = 0;

  for (const appt of due) {
    await prisma.$transaction(async (tx) => {
      // Use a guarded update so concurrent runs don't double-complete.
      const result = await tx.appointment.updateMany({
        where: { id: appt.id, status: 'CONFIRMED' },
        data: { status: 'COMPLETED' },
      });
      if (result.count === 0) return;
      completed += 1;

      await createNotification(tx, {
        userId: appt.customer.userId,
        type: 'REVIEW_REQUEST',
        titleKey: 'notifications.reviewRequest.title',
        bodyKey: 'notifications.reviewRequest.body',
        payload: {
          appointmentId: appt.id,
          professionalName: appt.professional.displayName,
          serviceName: appt.service.name,
          target: `/appointments/${appt.id}/review`,
        },
        appointmentId: appt.id,
      });
      notified += 1;
    });
  }

  return { completed, notified };
}
