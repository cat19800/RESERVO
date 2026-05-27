'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, RefreshCw, XCircle, MinusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type ApiResult, isFailure } from '@/types/api';
import { type ReminderTickResult } from '@/lib/reminders';
import { type ReminderHistoryDto } from '@/app/api/dev/reminders/history/route';
import { cn } from '@/lib/utils';

const HISTORY_KEY = ['dev', 'reminders', 'history'] as const;

async function fetchHistory(): Promise<ReminderHistoryDto[]> {
  const res = await fetch('/api/dev/reminders/history', { credentials: 'include' });
  const json = (await res.json()) as ApiResult<ReminderHistoryDto[]>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

async function runTick(force: boolean): Promise<ReminderTickResult> {
  const url = force ? '/api/dev/reminders/run?force=1' : '/api/dev/reminders/run';
  const res = await fetch(url, { method: 'POST', credentials: 'include' });
  const json = (await res.json()) as ApiResult<ReminderTickResult>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

export function RemindersConsole() {
  const t = useTranslations();
  const fmt = useFormatter();
  const qc = useQueryClient();
  const [lastResult, setLastResult] = useState<ReminderTickResult | null>(null);
  const { data: history = [], isLoading } = useQuery({
    queryKey: HISTORY_KEY,
    queryFn: fetchHistory,
  });

  const tick = useMutation({
    mutationFn: runTick,
    onSuccess: (result) => {
      setLastResult(result);
      void qc.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });

  const fmtDate = (iso: string) =>
    fmt.dateTime(new Date(iso), {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  return (
    <div className="grid gap-6">
      <section className="border-border bg-card grid gap-3 rounded-2xl border p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => tick.mutate(false)}
            disabled={tick.isPending}
            variant="outline"
          >
            <RefreshCw
              className={cn('h-4 w-4', tick.isPending && 'animate-spin')}
              aria-hidden
            />
            {t('dev.reminders.runNow')}
          </Button>
          <Button
            type="button"
            onClick={() => tick.mutate(true)}
            disabled={tick.isPending}
          >
            {t('dev.reminders.runForce')}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">{t('dev.reminders.helper')}</p>
        {tick.isError && (
          <p className="text-destructive text-sm">{(tick.error as Error).message}</p>
        )}
        {lastResult && (
          <div className="border-border bg-muted/30 grid gap-2 rounded-lg border p-3 text-xs">
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              <Stat label={t('dev.reminders.scanned')} value={lastResult.scanned} />
              <Stat label={t('dev.reminders.sent')} value={lastResult.sent} tone="success" />
              <Stat label={t('dev.reminders.skipped')} value={lastResult.skipped} />
              <Stat
                label={t('dev.reminders.failed')}
                value={lastResult.failed}
                tone={lastResult.failed > 0 ? 'destructive' : undefined}
              />
            </div>
            <p className="text-muted-foreground">
              {t('dev.reminders.completedPast', {
                completed: lastResult.completedPast.completed,
                notified: lastResult.completedPast.notified,
              })}
            </p>
          </div>
        )}
      </section>

      <section className="grid gap-2">
        <h2 className="text-sm font-semibold tracking-tight">
          {t('dev.reminders.historyTitle')}
        </h2>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
        ) : history.length === 0 ? (
          <div className="border-border bg-muted/30 rounded-2xl border border-dashed p-4 text-center">
            <p className="text-muted-foreground text-sm">{t('dev.reminders.historyEmpty')}</p>
          </div>
        ) : (
          <ul className="border-border bg-card grid divide-y rounded-2xl border shadow-sm">
            {history.map((row) => (
              <li key={row.id} className="grid gap-1 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <StatusIcon status={row.status} />
                  <p className="truncate font-medium">
                    {row.appointment.professional.displayName}
                  </p>
                  <span className="text-muted-foreground text-xs">·</span>
                  <p className="text-muted-foreground truncate text-xs">
                    {row.appointment.service.name}
                  </p>
                </div>
                <p className="text-muted-foreground text-xs">
                  {t('dev.reminders.row.toCustomer', {
                    email: row.appointment.customer.userEmail,
                  })}
                </p>
                <div className="text-muted-foreground flex flex-wrap gap-3 text-[10px] uppercase tracking-wide">
                  <span>{row.channel}</span>
                  <span>{t('dev.reminders.row.appointmentAt', { when: fmtDate(row.appointment.startsAt) })}</span>
                  <span>{t('dev.reminders.row.sentAt', { when: fmtDate(row.sentAt) })}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'success' | 'destructive';
}) {
  return (
    <div className="grid gap-0.5">
      <span className="text-muted-foreground text-[10px] uppercase tracking-wide">{label}</span>
      <span
        className={cn(
          'text-sm font-semibold',
          tone === 'success' && 'text-emerald-600 dark:text-emerald-400',
          tone === 'destructive' && 'text-destructive',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'sent') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />;
  }
  if (status === 'failed') {
    return <XCircle className="text-destructive h-4 w-4" aria-hidden />;
  }
  return <MinusCircle className="text-muted-foreground h-4 w-4" aria-hidden />;
}
