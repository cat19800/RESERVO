import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, ok } from '@/lib/api';
import { requireCustomer } from '@/lib/auth/guards';
import {
  createAppointmentSchema,
  HOLD_DURATION_MINUTES,
  type AppointmentDto,
} from '@/schemas/booking';
import { APPOINTMENT_INCLUDE, appointmentToDto, isUniqueViolation } from '@/lib/booking';

/**
 * Create a HELD (tentative) appointment for the current customer.
 *
 * Race protection: a partial unique index on
 *   ("professionalId", "startsAt") WHERE status IN ('HELD','CONFIRMED')
 * means a duplicate insert raises Postgres 23505, which Prisma surfaces as P2002.
 * We translate that to a 409 SLOT_TAKEN.
 *
 * Stale holds (tentativeUntil < now) would block new bookings under the index,
 * so we sweep them to CANCELLED first inside the same transaction. This is
 * idempotent and bounded — only touches HELD rows for this pro at this slot.
 */
export const POST = handle(async (req: NextRequest) => {
  const user = await requireCustomer();
  const body = createAppointmentSchema.parse(await req.json());

  // Validate the service belongs to the requested pro and is active.
  const service = await prisma.service.findUnique({
    where: { id: body.serviceId },
    select: { id: true, professionalId: true, durationMinutes: true, active: true },
  });
  if (!service || service.professionalId !== body.professionalId || !service.active) {
    throw new ApiError('SERVICE_NOT_FOUND', 404);
  }

  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);
  const now = new Date();
  if (startsAt <= now) throw new ApiError('SLOT_IN_PAST', 400);
  const tentativeUntil = new Date(now.getTime() + HOLD_DURATION_MINUTES * 60_000);

  try {
    const created = await prisma.$transaction(async (tx) => {
      // 1. Sweep stale holds for this pro+slot. The partial index would
      //    otherwise block our insert because of an expired hold from someone else.
      await tx.appointment.updateMany({
        where: {
          professionalId: body.professionalId,
          startsAt,
          status: 'HELD',
          tentativeUntil: { lt: now },
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          cancelledBy: 'SYSTEM',
          cancellationReason: 'hold_expired',
        },
      });

      // 2. Insert. The partial unique index races here.
      return tx.appointment.create({
        data: {
          customerId: user.customerId,
          professionalId: body.professionalId,
          serviceId: body.serviceId,
          startsAt,
          endsAt,
          status: 'HELD',
          tentativeUntil,
        },
        include: APPOINTMENT_INCLUDE,
      });
    });

    const dto: AppointmentDto = appointmentToDto(created);
    return ok(dto, { status: 201 });
  } catch (e) {
    if (isUniqueViolation(e)) throw new ApiError('SLOT_TAKEN', 409);
    throw e;
  }
});
