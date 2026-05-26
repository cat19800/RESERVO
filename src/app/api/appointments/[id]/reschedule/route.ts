import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, ok } from '@/lib/api';
import { requireCustomer } from '@/lib/auth/guards';
import { rescheduleAppointmentSchema } from '@/schemas/cancellation';
import { canReschedule } from '@/lib/cancellation';
import { APPOINTMENT_INCLUDE, appointmentToDto, isUniqueViolation } from '@/lib/booking';
import { generateSlots } from '@/lib/slots';
import { createNotification } from '@/lib/notifications';

/**
 * Reschedule a CONFIRMED appointment to a new time on the same service.
 * Customer must still be inside the cancellation window.
 *
 * Single UPDATE statement; the partial unique index on (professionalId, startsAt)
 * raises 23505 (Prisma P2002) if the new slot is taken — translated to 409.
 * No lock-ordering issue because we touch only one row.
 */
export const PATCH = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireCustomer();
    const { id } = await ctx.params;
    const body = rescheduleAppointmentSchema.parse(await req.json());

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        professional: {
          include: {
            cancellationRules: true,
            schedule: {
              include: {
                workingHours: true,
                blockedPeriods: true,
              },
            },
          },
        },
        service: true,
      },
    });
    if (!appointment) throw new ApiError('NOT_FOUND', 404);
    if (appointment.customerId !== user.customerId) throw new ApiError('NOT_FOUND', 404);

    const rules = appointment.professional.cancellationRules ?? { deadlineHours: 24 };
    const gate = canReschedule({
      appointment: { startsAt: appointment.startsAt, status: appointment.status },
      rules,
      actor: 'CUSTOMER',
    });
    if (!gate.ok) {
      throw new ApiError(gate.reason, gate.reason === 'NOT_CONFIRMED' ? 409 : 403);
    }

    const newStart = new Date(body.startsAt);
    const now = new Date();
    if (newStart <= now) throw new ApiError('SLOT_IN_PAST', 400);
    const newEnd = new Date(newStart.getTime() + appointment.service.durationMinutes * 60_000);

    // Validate the requested slot is actually within the pro's working hours
    // and doesn't overlap a blocked period or *another* active appointment.
    const schedule = appointment.professional.schedule;
    if (!schedule) throw new ApiError('SCHEDULE_NOT_FOUND', 404);

    const dayStart = new Date(newStart);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const otherActive = await prisma.appointment.findMany({
      where: {
        professionalId: appointment.professionalId,
        id: { not: id },
        endsAt: { gt: dayStart },
        startsAt: { lt: dayEnd },
        OR: [{ status: 'CONFIRMED' }, { status: 'HELD', tentativeUntil: { gt: now } }],
      },
      select: { startsAt: true, endsAt: true },
    });

    const validSlots = generateSlots({
      workingHours: schedule.workingHours,
      blockedPeriods: [...schedule.blockedPeriods, ...otherActive],
      slotGranularityMinutes: schedule.slotGranularityMinutes,
      bufferMinutes: schedule.bufferMinutes,
      serviceDurationMinutes: appointment.service.durationMinutes,
      fromDate: dayStart,
      toDate: dayEnd,
    });
    const matching = validSlots.find((s) => s.startsAt.getTime() === newStart.getTime());
    if (!matching) throw new ApiError('SLOT_UNAVAILABLE', 409);

    try {
      const updated = await prisma.appointment.update({
        where: { id },
        data: { startsAt: newStart, endsAt: newEnd },
        include: APPOINTMENT_INCLUDE,
      });

      const customerName =
        `${updated.customer.user.profile?.firstName ?? ''} ${updated.customer.user.profile?.lastName ?? ''}`.trim() ||
        updated.customer.user.email;

      await createNotification(prisma, {
        userId: updated.professional.userId,
        type: 'BOOKING_RESCHEDULED',
        titleKey: 'notifications.bookingRescheduled.title',
        bodyKey: 'notifications.bookingRescheduled.body',
        payload: {
          appointmentId: updated.id,
          customerName,
          serviceName: updated.service.name,
          newStartsAtIso: updated.startsAt.toISOString(),
          target: `/pro/appointments`,
        },
        appointmentId: updated.id,
      });

      return ok(appointmentToDto(updated));
    } catch (e) {
      if (isUniqueViolation(e)) throw new ApiError('SLOT_TAKEN', 409);
      throw e;
    }
  },
);
