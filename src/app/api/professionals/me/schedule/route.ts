import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, ok } from '@/lib/api';
import { requireProfessional } from '@/lib/auth/guards';
import { scheduleUpdateSchema, type ScheduleResponse } from '@/schemas/schedule';

export const GET = handle(async () => {
  const user = await requireProfessional();
  const schedule = await prisma.schedule.findUnique({
    where: { professionalId: user.professionalId },
    include: {
      workingHours: {
        select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      },
    },
  });
  if (!schedule) throw new ApiError('SCHEDULE_NOT_FOUND', 404);

  const dto: ScheduleResponse = {
    slotGranularityMinutes: schedule.slotGranularityMinutes,
    bufferMinutes: schedule.bufferMinutes,
    workingHours: schedule.workingHours,
  };
  return ok(dto);
});

export const PUT = handle(async (req: NextRequest) => {
  const user = await requireProfessional();
  const body = scheduleUpdateSchema.parse(await req.json());

  const schedule = await prisma.schedule.findUnique({
    where: { professionalId: user.professionalId },
    select: { id: true },
  });
  if (!schedule) throw new ApiError('SCHEDULE_NOT_FOUND', 404);

  // Replace working hours atomically (delete-all + create-many in a tx).
  const updated = await prisma.$transaction(async (tx) => {
    await tx.workingHours.deleteMany({ where: { scheduleId: schedule.id } });

    if (body.workingHours.length > 0) {
      await tx.workingHours.createMany({
        data: body.workingHours.map((wh) => ({
          scheduleId: schedule.id,
          dayOfWeek: wh.dayOfWeek,
          startTime: wh.startTime,
          endTime: wh.endTime,
        })),
      });
    }

    if (body.slotGranularityMinutes !== undefined || body.bufferMinutes !== undefined) {
      await tx.schedule.update({
        where: { id: schedule.id },
        data: {
          slotGranularityMinutes: body.slotGranularityMinutes,
          bufferMinutes: body.bufferMinutes,
        },
      });
    }

    return tx.schedule.findUniqueOrThrow({
      where: { id: schedule.id },
      include: {
        workingHours: {
          select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
    });
  });

  const dto: ScheduleResponse = {
    slotGranularityMinutes: updated.slotGranularityMinutes,
    bufferMinutes: updated.bufferMinutes,
    workingHours: updated.workingHours,
  };
  return ok(dto);
});
