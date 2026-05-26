'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';
import { addDays, startOfToday } from 'date-fns';
import { Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { type ApiResult, isFailure } from '@/types/api';
import { type AvailabilityResponse, type AppointmentDto } from '@/schemas/booking';
import { cn } from '@/lib/utils';

const DATE_RANGE_DAYS = 14;
const APP_TZ = 'Europe/Athens';

type RescheduleErrorKey =
  | 'appointments.errors.SLOT_TAKEN'
  | 'appointments.errors.SLOT_UNAVAILABLE'
  | 'appointments.errors.SLOT_IN_PAST'
  | 'appointments.errors.CANCEL_DEADLINE_PASSED'
  | 'appointments.errors.NOT_CONFIRMED';

async function fetchAvailability(
  professionalId: string,
  serviceId: string,
  fromDate: Date,
  toDate: Date,
): Promise<AvailabilityResponse> {
  const p = new URLSearchParams({
    serviceId,
    fromDate: fromDate.toISOString(),
    toDate: toDate.toISOString(),
  });
  const res = await fetch(`/api/pros/${professionalId}/availability?${p.toString()}`, {
    credentials: 'include',
  });
  const json = (await res.json()) as ApiResult<AvailabilityResponse>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

async function reschedule(id: string, startsAt: string): Promise<AppointmentDto> {
  const res = await fetch(`/api/appointments/${id}/reschedule`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ startsAt }),
  });
  const json = (await res.json()) as ApiResult<AppointmentDto>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

export function RescheduleFlow({
  appointmentId,
  professionalId,
  serviceId,
  serviceName,
  serviceDurationMinutes,
  locale,
  initialStartsAt,
}: {
  appointmentId: string;
  professionalId: string;
  serviceId: string;
  serviceName: string;
  serviceDurationMinutes: number;
  locale: string;
  /** ISO datetime — used to default the calendar to that day. */
  initialStartsAt: string;
}) {
  const t = useTranslations();
  const fmt = useFormatter();
  const router = useRouter();
  const qc = useQueryClient();

  const dates = useMemo(() => {
    const today = startOfToday();
    return Array.from({ length: DATE_RANGE_DAYS }, (_, i) => addDays(today, i));
  }, []);

  const initialDay = useMemo(() => {
    const d = new Date(initialStartsAt);
    d.setHours(0, 0, 0, 0);
    const today = startOfToday();
    return d > today ? d : today;
  }, [initialStartsAt]);

  const [chosenDate, setChosenDate] = useState<Date>(initialDay);
  const [error, setError] = useState<string | null>(null);

  const dayStart = useMemo(() => {
    const d = new Date(chosenDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [chosenDate]);
  const dayEnd = useMemo(() => addDays(dayStart, 1), [dayStart]);

  const availability = useQuery({
    queryKey: ['availability', professionalId, serviceId, dayStart.toISOString()],
    queryFn: () => fetchAvailability(professionalId, serviceId, dayStart, dayEnd),
  });

  const rescheduleMut = useMutation({
    mutationFn: (startsAt: string) => reschedule(appointmentId, startsAt),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['customer', 'appointments'] });
      router.push(`/${locale}/appointments/${appointmentId}?rescheduled=1`);
      router.refresh();
    },
    onError: (e: Error) => {
      const code = e.message;
      const known = ['SLOT_TAKEN', 'SLOT_UNAVAILABLE', 'SLOT_IN_PAST', 'CANCEL_DEADLINE_PASSED', 'NOT_CONFIRMED'];
      if (known.includes(code)) {
        setError(t(`appointments.errors.${code}` as RescheduleErrorKey));
      } else {
        setError(t('auth.errors.INTERNAL_ERROR'));
      }
      qc.invalidateQueries({
        queryKey: ['availability', professionalId, serviceId, dayStart.toISOString()],
      });
    },
  });

  const slots = availability.data?.slots ?? [];

  return (
    <section className="grid gap-4">
      <p className="text-muted-foreground text-xs">
        {serviceName} · {t('pros.profile.durationDisplay', { minutes: serviceDurationMinutes })}
      </p>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {dates.map((d) => {
          const isActive = d.toDateString() === chosenDate.toDateString();
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => setChosenDate(d)}
              aria-pressed={isActive}
              className={cn(
                'flex min-w-14 shrink-0 flex-col items-center justify-center rounded-2xl border px-3 py-2 transition',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card hover:bg-muted',
              )}
            >
              <span className="text-[11px] font-medium uppercase">
                {fmt.dateTime(d, { weekday: 'short' })}
              </span>
              <span className="text-base font-semibold">
                {fmt.dateTime(d, { day: '2-digit' })}
              </span>
              <span className="text-[10px]">{fmt.dateTime(d, { month: 'short' })}</span>
            </button>
          );
        })}
      </div>

      {availability.isLoading ? (
        <p className="text-muted-foreground text-sm">{t('booking.datetime.loadingSlots')}</p>
      ) : availability.isError ? (
        <p className="text-destructive text-sm">{t('booking.errors.SCHEDULE_NOT_FOUND')}</p>
      ) : slots.length === 0 ? (
        <div className="border-border bg-muted/30 rounded-2xl border border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">{t('booking.datetime.noSlots')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((s) => (
            <button
              key={s.startsAt}
              type="button"
              disabled={rescheduleMut.isPending}
              onClick={() => {
                setError(null);
                rescheduleMut.mutate(s.startsAt);
              }}
              className="border-border bg-card hover:bg-primary/10 hover:border-primary/40 disabled:opacity-50 inline-flex items-center justify-center gap-1 rounded-xl border px-2 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Clock className="h-3 w-3" aria-hidden />
              {fmt.dateTime(new Date(s.startsAt), {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: APP_TZ,
              })}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex justify-end">
        <Button
          variant="ghost"
          onClick={() => router.push(`/${locale}/appointments/${appointmentId}`)}
          disabled={rescheduleMut.isPending}
        >
          {t('common.cancel')}
        </Button>
      </div>
    </section>
  );
}
