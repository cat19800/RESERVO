import { ApiError, handle, ok } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';

export type ReminderHistoryDto = {
  id: string;
  appointmentId: string;
  channel: string;
  status: string;
  sentAt: string;
  meta: Record<string, unknown>;
  appointment: {
    startsAt: string;
    service: { name: string };
    professional: { displayName: string };
    customer: { userEmail: string };
  };
};

/**
 * Dev-only: list the last 50 ReminderHistory rows newest-first, with enough
 * appointment context for the dev page to render a recognizable log.
 */
export const GET = handle(async () => {
  if (!env.DEV_TOOLS) throw new ApiError('FORBIDDEN', 403);

  const rows = await prisma.reminderHistory.findMany({
    orderBy: { sentAt: 'desc' },
    take: 50,
    include: {
      appointment: {
        select: {
          startsAt: true,
          service: { select: { name: true } },
          professional: { select: { displayName: true } },
          customer: { select: { user: { select: { email: true } } } },
        },
      },
    },
  });

  const dtos: ReminderHistoryDto[] = rows.map((r) => ({
    id: r.id,
    appointmentId: r.appointmentId,
    channel: r.channel,
    status: r.status,
    sentAt: r.sentAt.toISOString(),
    meta: (r.meta ?? {}) as Record<string, unknown>,
    appointment: {
      startsAt: r.appointment.startsAt.toISOString(),
      service: { name: r.appointment.service.name },
      professional: { displayName: r.appointment.professional.displayName },
      customer: { userEmail: r.appointment.customer.user.email },
    },
  }));

  return ok(dtos);
});
