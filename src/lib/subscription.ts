import { type Subscription, type PaymentRecord } from '@generated/client';
import { isActivePremium } from '@/lib/premium';
import { type SubscriptionDto, type PaymentRecordDto } from '@/schemas/subscription';

export function subscriptionToDto(
  s: Subscription & { payments?: unknown[] },
): SubscriptionDto {
  return {
    id: s.id,
    plan: s.plan,
    status: s.status,
    startedAt: s.startedAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    cancelledAt: s.cancelledAt?.toISOString() ?? null,
    isActive: isActivePremium(s),
  };
}

export function paymentToDto(p: PaymentRecord): PaymentRecordDto {
  return {
    id: p.id,
    amountCents: p.amountCents,
    currency: p.currency,
    status: p.status,
    bankRef: p.bankRef,
    errorMessage: p.errorMessage,
    cardLast4: p.cardLast4,
    createdAt: p.createdAt.toISOString(),
  };
}
