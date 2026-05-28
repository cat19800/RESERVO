import { z } from 'zod';
import { type SubscriptionPlan, type SubscriptionStatus, type PaymentStatus } from '@generated/client';

export const upgradeFormSchema = z.object({
  cardholderName: z
    .string()
    .trim()
    .min(2, 'premium.errors.cardholderName')
    .max(100, 'premium.errors.cardholderName'),
  // 13–19 digits, allow internal spaces
  cardNumber: z
    .string()
    .trim()
    .regex(/^\d{4}( ?\d{4}){2}( ?\d{1,7})$/, 'premium.errors.cardNumber'),
  cardExpiry: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'premium.errors.cardExpiry'),
  cardCvv: z
    .string()
    .trim()
    .regex(/^\d{3,4}$/, 'premium.errors.cardCvv'),
});
export type UpgradeFormInput = z.infer<typeof upgradeFormSchema>;

export type SubscriptionDto = {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt: string;
  cancelledAt: string | null;
  isActive: boolean;
};

export type PaymentRecordDto = {
  id: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  bankRef: string | null;
  errorMessage: string | null;
  cardLast4: string;
  createdAt: string;
};

export type SubscriptionResponseDto = {
  subscription: SubscriptionDto | null;
  payments: PaymentRecordDto[];
  priceCents: number;
};
