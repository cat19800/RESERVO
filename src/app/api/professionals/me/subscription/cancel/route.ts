import { prisma } from '@/lib/prisma';
import { ApiError, handle, ok } from '@/lib/api';
import { requireProfessional } from '@/lib/auth/guards';
import { subscriptionToDto } from '@/lib/subscription';

/**
 * Cancel a Premium subscription. The subscription remains usable until
 * `expiresAt` — we mark `status=CANCELLED` and stamp `cancelledAt`, but
 * `isActivePremium` continues to return true until the paid period ends.
 * That's deliberate (don't punish the pro who paid for the month).
 */
export const POST = handle(async () => {
  const user = await requireProfessional();

  const result = await prisma.subscription.updateMany({
    where: {
      professionalId: user.professionalId,
      status: 'ACTIVE',
    },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    },
  });
  if (result.count === 0) throw new ApiError('NO_ACTIVE_SUBSCRIPTION', 409);

  const sub = await prisma.subscription.findUniqueOrThrow({
    where: { professionalId: user.professionalId },
  });
  return ok(subscriptionToDto(sub));
});
