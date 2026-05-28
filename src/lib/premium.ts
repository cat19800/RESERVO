import { type Subscription } from '@generated/client';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/api';

export const PREMIUM_PRICE_CENTS = 999; // €9.99/month
export const PREMIUM_BILLING_DAYS = 30;

/**
 * Pure gate: a subscription is "premium-active" when status=ACTIVE and the
 * expiry has not yet passed. Cancelled-but-not-yet-expired subscriptions still
 * grant premium access until the paid period runs out — that's a deliberate
 * UX choice (don't punish a customer who paid for the month).
 */
export function isActivePremium(
  subscription: Pick<Subscription, 'status' | 'expiresAt'> | null,
  now: Date = new Date(),
): boolean {
  if (!subscription) return false;
  if (subscription.expiresAt.getTime() <= now.getTime()) return false;
  return subscription.status === 'ACTIVE' || subscription.status === 'CANCELLED';
}

/**
 * Throws 403 PREMIUM_REQUIRED unless the calling professional has a live
 * premium subscription. Designed for analytics route handlers.
 */
export async function requirePremium(professionalId: string): Promise<void> {
  const sub = await prisma.subscription.findUnique({
    where: { professionalId },
    select: { status: true, expiresAt: true },
  });
  if (!isActivePremium(sub)) {
    throw new ApiError('PREMIUM_REQUIRED', 403);
  }
}

export function nextExpiryFromNow(now: Date = new Date()): Date {
  return new Date(now.getTime() + PREMIUM_BILLING_DAYS * 24 * 60 * 60 * 1000);
}
