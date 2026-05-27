import { prisma } from '@/lib/prisma';
import { handle, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth/guards';

/**
 * Mark every unread notification for the calling user as read. Single
 * statement keeps row locks short. Returns the count flipped (mostly for
 * debugging; client just refetches).
 */
export const POST = handle(async () => {
  const user = await requireUser();
  const result = await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return ok({ updated: result.count });
});
