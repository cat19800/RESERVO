import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth/guards';
import { APPOINTMENT_INCLUDE, appointmentToDto } from '@/lib/booking';

/**
 * Fetch a single appointment. Visible to either the customer or the pro
 * involved; everyone else gets a 404 (don't leak existence).
 */
export const GET = handle(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await ctx.params;

    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: APPOINTMENT_INCLUDE,
    });
    if (!appt) throw new ApiError('NOT_FOUND', 404);

    const allowed =
      (user.customerId && appt.customerId === user.customerId) ||
      (user.professionalId && appt.professionalId === user.professionalId);
    if (!allowed) throw new ApiError('NOT_FOUND', 404);

    return ok(appointmentToDto(appt));
  },
);
