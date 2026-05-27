import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth/guards';

/**
 * Mark a single notification as read. Idempotent — re-marking sets `readAt`
 * again, which is harmless. Scoped to the calling user via WHERE clause; a
 * stranger calling this with someone else's id gets NOT_FOUND.
 */
export const POST = handle(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await ctx.params;

    const result = await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { readAt: new Date() },
    });
    if (result.count === 0) throw new ApiError('NOT_FOUND', 404);

    return ok({ id });
  },
);
