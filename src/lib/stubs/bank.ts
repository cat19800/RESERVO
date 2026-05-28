import { env } from '@/lib/env';

export type ChargeInput = {
  amountCents: number;
  currency: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  cardholderName: string;
};

export type ChargeResult =
  | { ok: true; bankRef: string; cardLast4: string }
  | { ok: false; errorCode: string; errorMessage: string; cardLast4: string };

const FAILURE_CODES = [
  'INSUFFICIENT_FUNDS',
  'CARD_DECLINED',
  'GATEWAY_TIMEOUT',
] as const;

/**
 * Fake bank gateway. Does NO real network call — purely simulates a card
 * charge based on `BANK_STUB_MODE`:
 *
 *   - 'always-succeed' (default): every call returns ok with a synthetic bankRef
 *   - 'always-fail': returns a `CARD_DECLINED` error so we can demo UC9 alt-flow
 *   - 'random': 30% of calls fail with a randomly chosen error code
 *
 * The amount/currency are passed through unchanged. Card number is only
 * used to derive `cardLast4` for receipt display — never persisted in full.
 */
export function chargeCard(input: ChargeInput): ChargeResult {
  const cardLast4 = input.cardNumber.replace(/\s+/g, '').slice(-4);
  const mode = env.BANK_STUB_MODE;

  const failing =
    mode === 'always-fail' || (mode === 'random' && Math.random() < 0.3);
  if (failing) {
    const errorCode =
      mode === 'random'
        ? FAILURE_CODES[Math.floor(Math.random() * FAILURE_CODES.length)]!
        : 'CARD_DECLINED';
    return {
      ok: false,
      errorCode,
      errorMessage: `Simulated bank failure: ${errorCode}`,
      cardLast4,
    };
  }

  const bankRef = `stub_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return { ok: true, bankRef, cardLast4 };
}
