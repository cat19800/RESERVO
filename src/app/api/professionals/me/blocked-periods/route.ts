import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, ok } from '@/lib/api';
import { requireProfessional } from '@/lib/auth/guards';
import {
  blockedPeriodCreateSchema,
  type BlockedPeriodResponse,
} from '@/schemas/blocked-period';

function toDto(bp: {
  id: string;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
}): BlockedPeriodResponse {
  return {
    id: bp.id,
    startsAt: bp.startsAt.toISOString(),
    endsAt: bp.endsAt.toISOString(),
    reason: bp.reason,
  };
}

export const GET = handle(async () => {
  const user = await requireProfessional();
  const schedule = await prisma.schedule.findUnique({
    where: { professionalId: user.professionalId },
    select: { id: true },
  });
  if (!schedule) throw new ApiError('SCHEDULE_NOT_FOUND', 404);

  const periods = await prisma.blockedPeriod.findMany({
    where: { scheduleId: schedule.id },
    orderBy: { startsAt: 'asc' },
  });
  return ok(periods.map(toDto));
});

export const POST = handle(async (req: NextRequest) => {
  const user = await requireProfessional();
  const body = blockedPeriodCreateSchema.parse(await req.json());

  const schedule = await prisma.schedule.findUnique({
    where: { professionalId: user.professionalId },
    select: { id: true },
  });
  if (!schedule) throw new ApiError('SCHEDULE_NOT_FOUND', 404);

  const created = await prisma.blockedPeriod.create({
    data: {
      scheduleId: schedule.id,
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
      reason: body.reason,
    },
  });
  return ok(toDto(created), { status: 201 });
});
