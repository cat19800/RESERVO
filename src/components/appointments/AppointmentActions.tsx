'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { CalendarClock, X } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type ApiResult, isFailure } from '@/types/api';

async function cancelAppointment(id: string, reason?: string): Promise<void> {
  const res = await fetch(`/api/appointments/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(reason ? { reason } : {}),
  });
  const json = (await res.json()) as ApiResult<unknown>;
  if (isFailure(json)) throw new Error(json.error.code);
}

type Variant = 'customer' | 'professional';

export function AppointmentActions({
  id,
  locale,
  variant,
  showReschedule = true,
}: {
  id: string;
  locale: string;
  variant: Variant;
  /** Pros never reschedule a customer's booking — only the customer can pick a new time. */
  showReschedule?: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const cancelMut = useMutation({
    mutationFn: () => cancelAppointment(id, reason.trim() || undefined),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: [variant === 'customer' ? 'customer' : 'professional', 'appointments'],
      });
      setConfirmOpen(false);
      setReason('');
      router.refresh();
    },
    onError: (e: Error) => {
      const code = e.message;
      if (code === 'CANCEL_DEADLINE_PASSED') {
        setConfirmOpen(false);
        setDeadlineOpen(true);
        setError(null);
      } else if (code === 'NOT_CONFIRMED') {
        setError(t('appointments.errors.NOT_CONFIRMED'));
      } else {
        setError(t('auth.errors.INTERNAL_ERROR'));
      }
    },
  });

  const cancelLabel =
    variant === 'professional'
      ? t('appointments.pro.cancelAsPro')
      : t('appointments.detail.cancelAppointment');
  const cancelBody =
    variant === 'professional'
      ? t('appointments.pro.cancelAsProBody')
      : t('appointments.detail.cancelBody');

  return (
    <div className="grid gap-2">
      {showReschedule && variant === 'customer' && (
        <Link
          href={`/${locale}/appointments/${id}/reschedule`}
          className={buttonVariants({ variant: 'outline' })}
        >
          <CalendarClock className="mr-2 h-4 w-4" aria-hidden />
          {t('appointments.detail.reschedule')}
        </Link>
      )}
      <Button
        type="button"
        variant="destructive"
        onClick={() => {
          setError(null);
          setConfirmOpen(true);
        }}
      >
        <X className="mr-2 h-4 w-4" aria-hidden />
        {cancelLabel}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {variant === 'professional'
                ? t('appointments.pro.cancelAsPro')
                : t('appointments.detail.cancelTitle')}
            </DialogTitle>
            <DialogDescription>{cancelBody}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="cancel-reason">{t('appointments.detail.cancelReasonOptional')}</Label>
            <Textarea
              id="cancel-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelMut.mutate()}
              disabled={cancelMut.isPending}
            >
              {cancelMut.isPending ? t('common.loading') : cancelLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deadlineOpen} onOpenChange={setDeadlineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('appointments.detail.cancelDeadlinePassedTitle')}</DialogTitle>
            <DialogDescription>
              {t('appointments.detail.cancelDeadlinePassedBody')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDeadlineOpen(false)}>{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
