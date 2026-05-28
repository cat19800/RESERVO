import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, ok } from '@/lib/api';
import { requireProfessional } from '@/lib/auth/guards';
import { createNotification } from '@/lib/notifications';
import { chargeCard } from '@/lib/stubs/bank';
import {
  isActivePremium,
  nextExpiryFromNow,
  PREMIUM_PRICE_CENTS,
} from '@/lib/premium';
import { upgradeFormSchema, type SubscriptionResponseDto } from '@/schemas/subscription';
import { subscriptionToDto, paymentToDto } from '@/lib/subscription';

export const GET = handle(async () => {
  const user = await requireProfessional();

  const sub = await prisma.subscription.findUnique({
    where: { professionalId: user.professionalId },
    include: {
      payments: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });

  const dto: SubscriptionResponseDto = {
    subscription: sub ? subscriptionToDto(sub) : null,
    payments: sub ? sub.payments.map(paymentToDto) : [],
    priceCents: PREMIUM_PRICE_CENTS,
  };
  return ok(dto);
});

/**
 * Upgrade to (or renew) Premium. Charges the bank stub first; only on
 * success does the Subscription row + PaymentRecord (status=SUCCEEDED) +
 * PREMIUM_ACTIVATED notification get written, all in one transaction.
 * On bank failure we still write a PaymentRecord (status=FAILED) so the
 * pro can see "we tried" in their payment history.
 */
export const POST = handle(async (req: NextRequest) => {
  const user = await requireProfessional();
  const form = upgradeFormSchema.parse(await req.json());

  const existing = await prisma.subscription.findUnique({
    where: { professionalId: user.professionalId },
    select: { status: true, expiresAt: true },
  });
  if (isActivePremium(existing)) {
    throw new ApiError('ALREADY_ACTIVE', 409);
  }

  const charge = chargeCard({
    amountCents: PREMIUM_PRICE_CENTS,
    currency: 'EUR',
    cardNumber: form.cardNumber,
    cardExpiry: form.cardExpiry,
    cardCvv: form.cardCvv,
    cardholderName: form.cardholderName,
  });

  if (!charge.ok) {
    // Record the failure on a placeholder Subscription row so the pro can
    // see "we tried" in their history. Use upsert so retries don't dup.
    const sub = await prisma.subscription.upsert({
      where: { professionalId: user.professionalId },
      create: {
        professionalId: user.professionalId,
        plan: 'PREMIUM_MONTHLY',
        status: 'EXPIRED',
        expiresAt: new Date(),
      },
      update: {},
    });
    await prisma.paymentRecord.create({
      data: {
        subscriptionId: sub.id,
        amountCents: PREMIUM_PRICE_CENTS,
        currency: 'EUR',
        status: 'FAILED',
        errorMessage: charge.errorMessage,
        cardLast4: charge.cardLast4,
      },
    });
    throw new ApiError(charge.errorCode, 402, { message: charge.errorMessage });
  }

  const now = new Date();
  const expiresAt = nextExpiryFromNow(now);

  const updated = await prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.upsert({
      where: { professionalId: user.professionalId },
      create: {
        professionalId: user.professionalId,
        plan: 'PREMIUM_MONTHLY',
        status: 'ACTIVE',
        startedAt: now,
        expiresAt,
      },
      update: {
        status: 'ACTIVE',
        startedAt: now,
        expiresAt,
        cancelledAt: null,
      },
    });
    const payment = await tx.paymentRecord.create({
      data: {
        subscriptionId: sub.id,
        amountCents: PREMIUM_PRICE_CENTS,
        currency: 'EUR',
        status: 'SUCCEEDED',
        bankRef: charge.bankRef,
        cardLast4: charge.cardLast4,
      },
    });
    await createNotification(tx, {
      userId: user.id,
      type: 'PREMIUM_ACTIVATED',
      titleKey: 'notifications.premiumActivated.title',
      bodyKey: 'notifications.premiumActivated.body',
      payload: {
        amountCents: PREMIUM_PRICE_CENTS,
        currency: 'EUR',
        expiresAtIso: expiresAt.toISOString(),
        target: '/pro/premium',
      },
    });
    return { sub, payment };
  });

  return ok(
    {
      subscription: subscriptionToDto({
        ...updated.sub,
        payments: [updated.payment],
      }),
      payment: paymentToDto(updated.payment),
    },
    { status: 201 },
  );
});
