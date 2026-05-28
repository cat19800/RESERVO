'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFormatter, useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { type ApiResult, isFailure } from '@/types/api';
import {
  upgradeFormSchema,
  type UpgradeFormInput,
  type SubscriptionDto,
  type PaymentRecordDto,
} from '@/schemas/subscription';

type UpgradeOk = { subscription: SubscriptionDto; payment: PaymentRecordDto };

export function PremiumForm({ priceCents }: { priceCents: number }) {
  const t = useTranslations();
  const fmt = useFormatter();
  const qc = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<UpgradeOk | null>(null);

  const form = useForm<UpgradeFormInput>({
    resolver: zodResolver(upgradeFormSchema),
    defaultValues: {
      cardholderName: '',
      cardNumber: '',
      cardExpiry: '',
      cardCvv: '',
    },
  });

  const upgrade = useMutation({
    mutationFn: async (values: UpgradeFormInput) => {
      const res = await fetch('/api/professionals/me/subscription', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = (await res.json()) as ApiResult<UpgradeOk>;
      if (isFailure(json)) {
        const e = json.error;
        const err = new Error(e.code) as Error & { code: string };
        err.code = e.code;
        throw err;
      }
      return json.data;
    },
    onSuccess: (data) => {
      setSuccess(data);
      void qc.invalidateQueries({ queryKey: ['subscription'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => {
      const code = (err as Error & { code?: string }).code ?? 'INTERNAL_ERROR';
      setServerError(t(`pro.premium.errors.${code}` as 'pro.premium.errors.CARD_DECLINED'));
    },
  });

  function onSubmit(values: UpgradeFormInput) {
    setServerError(null);
    setSuccess(null);
    upgrade.mutate(values);
  }

  function tFieldError(key: string | undefined): string | undefined {
    if (!key) return undefined;
    if (key.startsWith('pro.premium.errors.')) {
      return t(key as 'pro.premium.errors.cardNumber');
    }
    return key;
  }

  const formattedPrice = fmt.number(priceCents / 100, {
    style: 'currency',
    currency: 'EUR',
  });

  if (success) {
    return (
      <div className="border-border bg-card grid gap-3 rounded-2xl border p-5 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight">
          {t('pro.premium.form.successTitle')}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t('pro.premium.form.successBody', {
            when: fmt.dateTime(new Date(success.subscription.expiresAt), {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }),
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="border-border bg-card grid gap-3 rounded-2xl border p-5 shadow-sm">
      <header>
        <h2 className="text-base font-semibold tracking-tight">
          {t('pro.premium.form.title')}
        </h2>
        <p className="text-muted-foreground text-xs">
          {t('pro.premium.form.subtitle')}
        </p>
      </header>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
          <FormField
            control={form.control}
            name="cardholderName"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{t('pro.premium.form.cardholderName')}</FormLabel>
                <FormControl>
                  <Input autoComplete="cc-name" {...field} />
                </FormControl>
                <FormMessage>{tFieldError(fieldState.error?.message)}</FormMessage>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cardNumber"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{t('pro.premium.form.cardNumber')}</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="cc-number"
                    inputMode="numeric"
                    placeholder="4242 4242 4242 4242"
                    {...field}
                  />
                </FormControl>
                <FormMessage>{tFieldError(fieldState.error?.message)}</FormMessage>
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="cardExpiry"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t('pro.premium.form.cardExpiry')}</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="cc-exp"
                      inputMode="numeric"
                      placeholder="09/27"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage>{tFieldError(fieldState.error?.message)}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cardCvv"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t('pro.premium.form.cardCvv')}</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="cc-csc"
                      inputMode="numeric"
                      placeholder="123"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage>{tFieldError(fieldState.error?.message)}</FormMessage>
                </FormItem>
              )}
            />
          </div>
          {serverError && <p className="text-destructive text-sm">{serverError}</p>}
          <Button type="submit" disabled={upgrade.isPending} className="w-full">
            {upgrade.isPending
              ? t('pro.premium.form.submitting')
              : t('pro.premium.form.submit', { amount: formattedPrice })}
          </Button>
        </form>
      </Form>
    </div>
  );
}
