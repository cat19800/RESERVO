import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, ok } from '@/lib/api';
import { requireCustomer } from '@/lib/auth/guards';
import { APPOINTMENT_INCLUDE, appointmentToDto } from '@/lib/booking';
import { createNotification } from '@/lib/notifications';

/**
 * HELD → CONFIRMED. Single-statement update so the row lock is held for
 * milliseconds (lock-short-transactions). The WHERE clause guards against
 * confirming an already-cancelled or expired hold; if the affected count is 0
 * we surface HOLD_GONE.
 */
export const POST = handle(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireCustomer();
    const { id } = await ctx.params;

    const now = new Date();
    const result = await prisma.appointment.updateMany({
      where: {
        id,
        customerId: user.customerId,
        status: 'HELD',
        tentativeUntil: { gt: now },
      },
      data: { status: 'CONFIRMED', tentativeUntil: null },
    });

    if (result.count === 0) {
      // Differentiate between "already not HELD" and "hold expired" via a follow-up read.
      const appt = await prisma.appointment.findFirst({
        where: { id, customerId: user.customerId },
        select: { status: true, tentativeUntil: true },
      });
      if (!appt) throw new ApiError('NOT_FOUND', 404);
      if (appt.status === 'CONFIRMED') throw new ApiError('ALREADY_CONFIRMED', 409);
      throw new ApiError('HOLD_GONE', 409);
    }

    const updated = await prisma.appointment.findUniqueOrThrow({
      where: { id },
      include: APPOINTMENT_INCLUDE,
    });

    const customerName =
      `${updated.customer.user.profile?.firstName ?? ''} ${updated.customer.user.profile?.lastName ?? ''}`.trim() ||
      updated.customer.user.email;
    const baseFields = {
      appointmentId: updated.id,
      professionalName: updated.professional.displayName,
      customerName,
      serviceName: updated.service.name,
      startsAtIso: updated.startsAt.toISOString(),
    };

    await prisma.$transaction([
      prisma.notification.create({
        data: {
          userId: updated.customer.userId,
          type: 'BOOKING_CONFIRMED',
          titleKey: 'notifications.bookingConfirmed.title',
          bodyKey: 'notifications.bookingConfirmed.body',
          payload: { ...baseFields, target: `/appointments/${updated.id}` },
          appointmentId: updated.id,
        },
      }),
      prisma.notification.create({
        data: {
          userId: updated.professional.userId,
          type: 'BOOKING_CONFIRMED',
          titleKey: 'notifications.bookingConfirmedPro.title',
          bodyKey: 'notifications.bookingConfirmedPro.body',
          payload: { ...baseFields, target: `/pro/appointments` },
          appointmentId: updated.id,
        },
      }),
    ]);

    return ok(appointmentToDto(updated));
  },
);
