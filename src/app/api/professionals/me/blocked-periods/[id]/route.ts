import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, ok } from '@/lib/api';
import { requireProfessional } from '@/lib/auth/guards';

export const DELETE = handle(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireProfessional();
    const { id } = await ctx.params;

    const period = await prisma.blockedPeriod.findUnique({
      where: { id },
      include: { schedule: { select: { professionalId: true } } },
    });
    if (!period || period.schedule.professionalId !== user.professionalId) {
      throw new ApiError('NOT_FOUND', 404);
    }

    await prisma.blockedPeriod.delete({ where: { id } });
    return ok({ ok: true });
  },
);
