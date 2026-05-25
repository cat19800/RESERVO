import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, ok } from '@/lib/api';
import { requireCustomer } from '@/lib/auth/guards';

/**
 * Release a HELD slot the customer chose not to confirm (UC1 alt-flow 2).
 * No-op if the hold has already expired or been confirmed.
 */
export const DELETE = handle(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireCustomer();
    const { id } = await ctx.params;

    const now = new Date();
    const result = await prisma.appointment.updateMany({
      where: { id, customerId: user.customerId, status: 'HELD' },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        cancelledBy: 'CUSTOMER',
        cancellationReason: 'user_aborted',
      },
    });

    if (result.count === 0) {
      const exists = await prisma.appointment.findFirst({
        where: { id, customerId: user.customerId },
        select: { id: true },
      });
      if (!exists) throw new ApiError('NOT_FOUND', 404);
      // Already CANCELLED or CONFIRMED — treat as a no-op.
    }

    return ok({ ok: true });
  },
);
