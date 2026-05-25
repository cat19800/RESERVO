'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { type ApiResult, isFailure } from '@/types/api';

async function confirmAppointment(id: string): Promise<void> {
  const res = await fetch(`/api/appointments/${id}/confirm`, {
    method: 'POST',
    credentials: 'include',
  });
  const json = (await res.json()) as ApiResult<unknown>;
  if (isFailure(json)) throw new Error(json.error.code);
}

async function releaseHold(id: string): Promise<void> {
  const res = await fetch(`/api/appointments/${id}/hold`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const json = (await res.json()) as ApiResult<unknown>;
  if (isFailure(json)) throw new Error(json.error.code);
}

export function HoldActions({ id, locale }: { id: string; locale: string }) {
  const t = useTranslations();
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const confirmMut = useMutation({
    mutationFn: () => confirmAppointment(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['customer', 'appointments'] });
      router.refresh();
    },
    onError: (e: Error) => {
      const code = e.message;
      if (code === 'HOLD_GONE' || code === 'ALREADY_CONFIRMED') {
        setError(t(`booking.errors.${code}` as 'booking.errors.HOLD_GONE'));
      } else {
        setError(t('auth.errors.INTERNAL_ERROR'));
      }
    },
  });

  const releaseMut = useMutation({
    mutationFn: () => releaseHold(id),
    onSettled: () => {
      router.push(`/${locale}/appointments`);
      router.refresh();
    },
  });

  return (
    <div className="grid gap-2">
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button
        type="button"
        onClick={() => confirmMut.mutate()}
        disabled={confirmMut.isPending || releaseMut.isPending}
      >
        {confirmMut.isPending ? (
          t('common.loading')
        ) : (
          <>
            <Check className="mr-1 h-4 w-4" aria-hidden />
            {t('booking.summary.confirm')}
          </>
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => releaseMut.mutate()}
        disabled={confirmMut.isPending || releaseMut.isPending}
      >
        {t('booking.summary.release')}
      </Button>
    </div>
  );
}
