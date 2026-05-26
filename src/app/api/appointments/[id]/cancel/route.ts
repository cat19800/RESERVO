import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth/guards';
import { cancelAppointmentSchema } from '@/schemas/cancellation';
import { canCancel } from '@/lib/cancellation';
import { APPOINTMENT_INCLUDE, appointmentToDto } from '@/lib/booking';
import { createNotification } from '@/lib/notifications';

/**
 * Cancel a CONFIRMED appointment. Either the customer or the professional on
 * the row may cancel; customers are bound by the pro's `CancellationRules`,
 * professionals are not (UC2 alt-flow 1; UC5 alt-flow 1 also relies on this).
 *
 * Single-statement update keeps the row lock short (lock-short-transactions).
 */
export const POST = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = cancelAppointmentSchema.parse(await req.json().catch(() => ({})));

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        professional: { include: { cancellationRules: true } },
      },
    });
    if (!appointment) throw new ApiError('NOT_FOUND', 404);

    const isCustomer = !!user.customerId && appointment.customerId === user.customerId;
    const isPro = !!user.professionalId && appointment.professionalId === user.professionalId;
    if (!isCustomer && !isPro) throw new ApiError('NOT_FOUND', 404);

    const actor: 'CUSTOMER' | 'PROFESSIONAL' = isCustomer ? 'CUSTOMER' : 'PROFESSIONAL';
    const rules = appointment.professional.cancellationRules ?? { deadlineHours: 24 };

    const gate = canCancel({
      appointment: { startsAt: appointment.startsAt, status: appointment.status },
      rules,
      actor,
    });
    if (!gate.ok) {
      throw new ApiError(gate.reason, gate.reason === 'NOT_CONFIRMED' ? 409 : 403);
    }

    const now = new Date();
    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        cancelledBy: actor,
        cancellationReason: body.reason,
      },
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
      reason: body.reason ?? null,
    };

    // Notify the *other* party. If the customer cancelled, the pro learns;
    // if the pro cancelled (UC5 alt-flow 1), the customer learns.
    if (actor === 'CUSTOMER') {
      await createNotification(prisma, {
        userId: updated.professional.userId,
        type: 'BOOKING_CANCELLED',
        titleKey: 'notifications.bookingCancelledByCustomer.title',
        bodyKey: 'notifications.bookingCancelledByCustomer.body',
        payload: { ...baseFields, target: `/pro/appointments` },
        appointmentId: updated.id,
      });
    } else {
      await createNotification(prisma, {
        userId: updated.customer.userId,
        type: 'BOOKING_CANCELLED',
        titleKey: 'notifications.bookingCancelledByProfessional.title',
        bodyKey: 'notifications.bookingCancelledByProfessional.body',
        payload: { ...baseFields, target: `/appointments/${updated.id}` },
        appointmentId: updated.id,
      });
    }

    return ok(appointmentToDto(updated));
  },
);
