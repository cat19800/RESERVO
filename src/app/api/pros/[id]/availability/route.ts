import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, ok } from '@/lib/api';
import { availabilityQuerySchema, type AvailabilityResponse } from '@/schemas/booking';
import { generateSlots } from '@/lib/slots';

const MAX_RANGE_DAYS = 60;

export const GET = handle(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id: professionalId } = await ctx.params;

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const { serviceId, fromDate, toDate } = availabilityQuerySchema.parse(params);

  const fromUtc = new Date(fromDate);
  const toUtc = new Date(toDate);
  if (toUtc <= fromUtc) throw new ApiError('INVALID_RANGE', 400);
  const days = (toUtc.getTime() - fromUtc.getTime()) / (24 * 60 * 60 * 1000);
  if (days > MAX_RANGE_DAYS) throw new ApiError('RANGE_TOO_LARGE', 400);

  // Fetch the service first to know the duration; bail if it's not active or
  // doesn't belong to this professional.
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, professionalId: true, durationMinutes: true, active: true },
  });
  if (!service || service.professionalId !== professionalId || !service.active) {
    throw new ApiError('SERVICE_NOT_FOUND', 404);
  }

  // Fetch schedule + working hours + blocked periods + active appointments in range.
  const schedule = await prisma.schedule.findUnique({
    where: { professionalId },
    include: {
      workingHours: { select: { dayOfWeek: true, startTime: true, endTime: true } },
      blockedPeriods: {
        where: { endsAt: { gt: fromUtc }, startsAt: { lt: toUtc } },
        select: { startsAt: true, endsAt: true },
      },
    },
  });
  if (!schedule) throw new ApiError('SCHEDULE_NOT_FOUND', 404);

  const now = new Date();
  const activeAppointments = await prisma.appointment.findMany({
    where: {
      professionalId,
      endsAt: { gt: fromUtc },
      startsAt: { lt: toUtc },
      OR: [
        { status: 'CONFIRMED' },
        { status: 'HELD', tentativeUntil: { gt: now } },
      ],
    },
    select: { startsAt: true, endsAt: true },
  });

  const slots = generateSlots({
    workingHours: schedule.workingHours,
    blockedPeriods: [...schedule.blockedPeriods, ...activeAppointments],
    slotGranularityMinutes: schedule.slotGranularityMinutes,
    bufferMinutes: schedule.bufferMinutes,
    serviceDurationMinutes: service.durationMinutes,
    fromDate: fromUtc,
    toDate: toUtc,
  });

  const dto: AvailabilityResponse = {
    slots: slots.map((s) => ({
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
    })),
  };
  return ok(dto);
});
