'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Sparkles, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type ApiResult, isFailure } from '@/types/api';
import {
  type SubscriptionDto,
  type SubscriptionResponseDto,
  type PaymentRecordDto,
} from '@/schemas/subscription';
import { useState } from 'react';
import { PremiumForm } from './PremiumForm';

const KEY = ['subscription'] as const;

async function fetchSubscription(): Promise<SubscriptionResponseDto> {
  const res = await fetch('/api/professionals/me/subscription', {
    credentials: 'include',
  });
  const json = (await res.json()) as ApiResult<SubscriptionResponseDto>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

export function PremiumPanel() {
  const t = useTranslations();
  const fmt = useFormatter();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: fetchSubscription,
  });
  const [cancelOpen, setCancelOpen] = useState(false);

  const cancel = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/professionals/me/subscription/cancel', {
        method: 'POST',
        credentials: 'include',
      });
      const json = (await res.json()) as ApiResult<SubscriptionDto>;
      if (isFailure(json)) throw new Error(json.error.code);
      return json.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      setCancelOpen(false);
    },
  });

  if (isLoading || !data) {
    return <p className="text-muted-foreground text-sm">{t('common.loading')}</p>;
  }

  const sub = data.subscription;
  const formattedPrice = fmt.number(data.priceCents / 100, {
    style: 'currency',
    currency: 'EUR',
  });

  return (
    <div className="grid gap-6">
      <PerksCard formattedPrice={formattedPrice} />

      {sub && sub.isActive ? (
        <ActiveCard
          subscription={sub}
          onCancel={() => setCancelOpen(true)}
        />
      ) : (
        <PremiumForm priceCents={data.priceCents} />
      )}

      {data.payments.length > 0 && (
        <PaymentHistory payments={data.payments} />
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pro.premium.cancelConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {sub &&
                t('pro.premium.cancelConfirmBody', {
                  when: fmt.dateTime(new Date(sub.expiresAt), {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  }),
                })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose>
              <Button variant="ghost">{t('common.cancel')}</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending}
            >
              {cancel.isPending ? t('common.loading') : t('pro.premium.cancelPlan')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PerksCard({ formattedPrice }: { formattedPrice: string }) {
  const t = useTranslations();
  return (
    <div className="border-border bg-gradient-to-br from-amber-100/40 to-amber-200/40 dark:from-amber-900/20 dark:to-amber-950/20 grid gap-3 rounded-2xl border p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden />
        <h2 className="text-lg font-semibold tracking-tight">{t('pro.premium.perks.title')}</h2>
      </div>
      <ul className="grid gap-2 text-sm">
        <Perk text={t('pro.premium.perks.analytics')} />
        <Perk text={t('pro.premium.perks.boost')} />
        <Perk text={t('pro.premium.perks.badge')} />
      </ul>
      <p className="text-muted-foreground text-xs">
        {t('pro.premium.monthlyPrice', { amount: formattedPrice })}
      </p>
    </div>
  );
}

function Perk({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
      <span>{text}</span>
    </li>
  );
}

function ActiveCard({
  subscription,
  onCancel,
}: {
  subscription: SubscriptionDto;
  onCancel: () => void;
}) {
  const t = useTranslations();
  const fmt = useFormatter();
  const fmtDate = (iso: string) =>
    fmt.dateTime(new Date(iso), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  return (
    <div className="border-border bg-card grid gap-3 rounded-2xl border p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{t('pro.premium.currentPlan')}</h2>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          {subscription.status === 'CANCELLED'
            ? t('pro.premium.cancelled')
            : t('pro.premium.active')}
        </span>
      </div>
      <p className="text-sm">
        {subscription.status === 'CANCELLED'
          ? t('pro.premium.cancelledAt', {
              when: subscription.cancelledAt ? fmtDate(subscription.cancelledAt) : '',
            })
          : t('pro.premium.renewsAt', { when: fmtDate(subscription.expiresAt) })}
      </p>
      <p className="text-muted-foreground text-xs">
        {t('pro.premium.expiresAt', { when: fmtDate(subscription.expiresAt) })}
      </p>
      {subscription.status === 'ACTIVE' && (
        <Button variant="outline" onClick={onCancel} className="justify-self-start">
          {t('pro.premium.cancelPlan')}
        </Button>
      )}
    </div>
  );
}

function PaymentHistory({ payments }: { payments: PaymentRecordDto[] }) {
  const t = useTranslations();
  const fmt = useFormatter();
  return (
    <section className="grid gap-2">
      <h2 className="text-sm font-semibold tracking-tight">{t('pro.premium.history.title')}</h2>
      <ul className="border-border bg-card divide-y rounded-2xl border shadow-sm">
        {payments.map((p) => (
          <li key={p.id} className="grid gap-1 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                {p.status === 'SUCCEEDED' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                ) : (
                  <XCircle className="text-destructive h-4 w-4" aria-hidden />
                )}
                <span className="font-medium">
                  {p.status === 'SUCCEEDED'
                    ? t('pro.premium.history.succeeded')
                    : t('pro.premium.history.failed')}
                </span>
              </span>
              <span className="font-semibold">
                {fmt.number(p.amountCents / 100, {
                  style: 'currency',
                  currency: p.currency,
                })}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              {t('pro.premium.history.cardRow', {
                last4: p.cardLast4,
                when: fmt.dateTime(new Date(p.createdAt), {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                }),
              })}
            </p>
            {p.errorMessage && (
              <p className="text-destructive text-xs">{p.errorMessage}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
