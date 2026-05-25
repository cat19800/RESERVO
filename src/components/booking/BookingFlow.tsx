'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';
import { addDays, startOfToday } from 'date-fns';
import { Check, ChevronLeft, Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { type ApiResult, isFailure } from '@/types/api';
import {
  type AvailabilityResponse,
  type AppointmentDto,
  type CreateAppointmentInput,
} from '@/schemas/booking';
import { type ProProfileDto } from '@/schemas/search';
import { cn } from '@/lib/utils';

const DATE_RANGE_DAYS = 14;
const APP_TZ = 'Europe/Athens';

type BookingErrorKey =
  | 'booking.errors.SLOT_TAKEN'
  | 'booking.errors.SLOT_IN_PAST'
  | 'booking.errors.SERVICE_NOT_FOUND'
  | 'booking.errors.HOLD_GONE'
  | 'booking.errors.ALREADY_CONFIRMED'
  | 'booking.errors.RANGE_TOO_LARGE'
  | 'booking.errors.INVALID_RANGE'
  | 'booking.errors.SCHEDULE_NOT_FOUND';

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

async function createAppointment(input: CreateAppointmentInput): Promise<AppointmentDto> {
  const res = await fetch('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResult<AppointmentDto>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

async function confirmAppointment(id: string): Promise<AppointmentDto> {
  const res = await fetch(`/api/appointments/${id}/confirm`, {
    method: 'POST',
    credentials: 'include',
  });
  const json = (await res.json()) as ApiResult<AppointmentDto>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

async function releaseHold(id: string): Promise<void> {
  const res = await fetch(`/api/appointments/${id}/hold`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const json = (await res.json()) as ApiResult<unknown>;
  if (isFailure(json)) throw new Error(json.error.code);
}

function formatPrice(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'el' ? 'el-GR' : 'en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

type Step = 'service' | 'datetime' | 'summary';

export function BookingFlow({
  pro,
  locale,
}: {
  pro: ProProfileDto;
  locale: string;
}) {
  const t = useTranslations();
  const fmt = useFormatter();
  const router = useRouter();
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>(pro.services.length > 0 ? 'service' : 'service');
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [chosenDate, setChosenDate] = useState<Date>(() => startOfToday());
  const [held, setHeld] = useState<AppointmentDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dates = useMemo(() => {
    const today = startOfToday();
    return Array.from({ length: DATE_RANGE_DAYS }, (_, i) => addDays(today, i));
  }, []);

  const dayStart = useMemo(() => {
    const d = new Date(chosenDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [chosenDate]);
  const dayEnd = useMemo(() => addDays(dayStart, 1), [dayStart]);

  const availability = useQuery({
    queryKey: ['availability', pro.id, serviceId, dayStart.toISOString()],
    queryFn: () => fetchAvailability(pro.id, serviceId!, dayStart, dayEnd),
    enabled: step === 'datetime' && !!serviceId,
  });

  const createMut = useMutation({
    mutationFn: createAppointment,
    onSuccess: (appt) => {
      setHeld(appt);
      setStep('summary');
      setError(null);
    },
    onError: (e: Error) => {
      const code = e.message;
      if (
        code === 'SLOT_TAKEN' ||
        code === 'SLOT_IN_PAST' ||
        code === 'SERVICE_NOT_FOUND'
      ) {
        setError(t(`booking.errors.${code}` as BookingErrorKey));
      } else {
        setError(t('auth.errors.INTERNAL_ERROR'));
      }
      // Refresh availability — the slot we tried might be gone now.
      qc.invalidateQueries({
        queryKey: ['availability', pro.id, serviceId, dayStart.toISOString()],
      });
    },
  });

  const confirmMut = useMutation({
    mutationFn: confirmAppointment,
    onSuccess: async (appt) => {
      await qc.invalidateQueries({ queryKey: ['customer', 'appointments'] });
      router.push(`/${locale}/appointments/${appt.id}?fresh=1`);
      router.refresh();
    },
    onError: (e: Error) => {
      const code = e.message;
      if (code === 'HOLD_GONE' || code === 'ALREADY_CONFIRMED') {
        setError(t(`booking.errors.${code}` as BookingErrorKey));
        // Reset back to datetime so they can pick another slot.
        setHeld(null);
        setStep('datetime');
      } else {
        setError(t('auth.errors.INTERNAL_ERROR'));
      }
    },
  });

  const releaseMut = useMutation({
    mutationFn: releaseHold,
    onSettled: () => {
      setHeld(null);
      setStep('datetime');
      qc.invalidateQueries({
        queryKey: ['availability', pro.id, serviceId, dayStart.toISOString()],
      });
    },
  });

  function pickService(id: string) {
    setServiceId(id);
    setStep('datetime');
    setError(null);
  }

  function pickSlot(startsAt: string) {
    if (!serviceId) return;
    setError(null);
    createMut.mutate({ professionalId: pro.id, serviceId, startsAt });
  }

  const chosenService = serviceId ? pro.services.find((s) => s.id === serviceId) : null;

  if (step === 'service' || !serviceId) {
    return (
      <ServiceStep
        pro={pro}
        onPick={pickService}
        t={t}
        formatPrice={(c) => formatPrice(c, locale)}
      />
    );
  }

  if (step === 'datetime' && chosenService) {
    return (
      <DateTimeStep
        pro={pro}
        service={chosenService}
        locale={locale}
        chosenDate={chosenDate}
        dates={dates}
        onDate={setChosenDate}
        slots={availability.data?.slots ?? []}
        loading={availability.isLoading}
        error={availability.isError ? t('booking.errors.SCHEDULE_NOT_FOUND') : null}
        onSlot={pickSlot}
        onBack={() => {
          setStep('service');
          setError(null);
        }}
        creating={createMut.isPending}
        serverError={error}
        fmt={fmt}
        t={t}
      />
    );
  }

  if (step === 'summary' && held && chosenService) {
    return (
      <SummaryStep
        held={held}
        service={chosenService}
        pro={pro}
        locale={locale}
        confirming={confirmMut.isPending}
        releasing={releaseMut.isPending}
        onConfirm={() => confirmMut.mutate(held.id)}
        onRelease={() => releaseMut.mutate(held.id)}
        serverError={error}
        fmt={fmt}
        t={t}
        formatPrice={(c) => formatPrice(c, locale)}
      />
    );
  }

  return null;
}

// ---- Step components ----

function ServiceStep({
  pro,
  onPick,
  t,
  formatPrice,
}: {
  pro: ProProfileDto;
  onPick: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
  formatPrice: (cents: number) => string;
}) {
  if (pro.services.length === 0) {
    return (
      <section className="grid gap-4">
        <header>
          <h2 className="text-xl font-semibold tracking-tight">{t('booking.service.title')}</h2>
          <p className="text-muted-foreground text-sm">{t('booking.service.subtitle')}</p>
        </header>
        <div className="border-border bg-muted/30 rounded-2xl border border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">{t('booking.service.noServices')}</p>
        </div>
      </section>
    );
  }
  return (
    <section className="grid gap-4">
      <header>
        <h2 className="text-xl font-semibold tracking-tight">{t('booking.service.title')}</h2>
        <p className="text-muted-foreground text-sm">{t('booking.service.subtitle')}</p>
      </header>
      <ul className="grid gap-2">
        {pro.services.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onPick(s.id)}
              className="border-border bg-card hover:bg-muted/40 focus-visible:ring-ring flex w-full items-start justify-between gap-3 rounded-2xl border p-4 text-left shadow-sm transition focus-visible:ring-2 focus-visible:outline-none"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{s.name}</p>
                {s.description && (
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{s.description}</p>
                )}
                <p className="text-muted-foreground mt-1 text-xs">
                  {t('pros.profile.durationDisplay', { minutes: s.durationMinutes })}
                </p>
              </div>
              <p className="text-foreground shrink-0 text-sm font-semibold">
                {s.priceCents === 0 ? t('pros.profile.priceFree') : formatPrice(s.priceCents)}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DateTimeStep({
  pro,
  service,
  locale,
  chosenDate,
  dates,
  onDate,
  slots,
  loading,
  error,
  onSlot,
  onBack,
  creating,
  serverError,
  fmt,
  t,
}: {
  pro: ProProfileDto;
  service: ProProfileDto['services'][number];
  locale: string;
  chosenDate: Date;
  dates: Date[];
  onDate: (d: Date) => void;
  slots: { startsAt: string; endsAt: string }[];
  loading: boolean;
  error: string | null;
  onSlot: (startsAt: string) => void;
  onBack: () => void;
  creating: boolean;
  serverError: string | null;
  fmt: ReturnType<typeof useFormatter>;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <section className="grid gap-4">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
          {t('common.back')}
        </Button>
        <span className="text-muted-foreground text-xs">
          {service.name} · {t('pros.profile.durationDisplay', { minutes: service.durationMinutes })}
        </span>
      </div>
      <header>
        <h2 className="text-xl font-semibold tracking-tight">{t('booking.datetime.title')}</h2>
        <p className="text-muted-foreground text-sm">{t('booking.datetime.subtitle')}</p>
      </header>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {dates.map((d) => {
          const isActive = d.toDateString() === chosenDate.toDateString();
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onDate(d)}
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
              <span className="text-[10px]">
                {fmt.dateTime(d, { month: 'short' })}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">{t('booking.datetime.loadingSlots')}</p>
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
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
              disabled={creating}
              onClick={() => onSlot(s.startsAt)}
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

      {serverError && <p className="text-destructive text-sm">{serverError}</p>}
      <p className="text-muted-foreground sr-only">{t('booking.withPro', { pro: pro.displayName })}</p>
      <p className="text-muted-foreground sr-only">{locale}</p>
    </section>
  );
}

function SummaryStep({
  held,
  service,
  pro,
  confirming,
  releasing,
  onConfirm,
  onRelease,
  serverError,
  fmt,
  t,
  formatPrice,
}: {
  held: AppointmentDto;
  service: ProProfileDto['services'][number];
  pro: ProProfileDto;
  locale: string;
  confirming: boolean;
  releasing: boolean;
  onConfirm: () => void;
  onRelease: () => void;
  serverError: string | null;
  fmt: ReturnType<typeof useFormatter>;
  t: ReturnType<typeof useTranslations>;
  formatPrice: (cents: number) => string;
}) {
  const start = new Date(held.startsAt);
  const tentativeUntil = held.tentativeUntil ? new Date(held.tentativeUntil) : null;

  return (
    <section className="grid gap-4">
      <header>
        <h2 className="text-xl font-semibold tracking-tight">{t('booking.summary.title')}</h2>
        <p className="text-muted-foreground text-sm">{t('booking.summary.subtitle')}</p>
      </header>

      <div className="border-border bg-card grid gap-3 rounded-2xl border p-4 shadow-sm">
        <Row
          label={t('booking.summary.professionalLabel')}
          value={`${pro.displayName} · ${pro.city}`}
        />
        <Row label={t('booking.summary.serviceLabel')} value={service.name} />
        <Row
          label={t('booking.summary.whenLabel')}
          value={fmt.dateTime(start, {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: APP_TZ,
          })}
        />
        <Row
          label={t('booking.summary.durationLabel')}
          value={t('pros.profile.durationDisplay', { minutes: service.durationMinutes })}
        />
        <Row
          label={t('booking.summary.priceLabel')}
          value={service.priceCents === 0 ? t('pros.profile.priceFree') : formatPrice(service.priceCents)}
        />
      </div>

      {tentativeUntil && (
        <p className="text-muted-foreground text-xs italic">
          {t('booking.summary.holdLabel', {
            until: fmt.dateTime(tentativeUntil, {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: APP_TZ,
            }),
          })}
        </p>
      )}

      {serverError && <p className="text-destructive text-sm">{serverError}</p>}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={onRelease}
          disabled={confirming || releasing}
        >
          {t('booking.summary.release')}
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={confirming || releasing}
          className="sm:min-w-44"
        >
          {confirming ? (
            t('common.loading')
          ) : (
            <>
              <Check className="mr-1 h-4 w-4" aria-hidden />
              {t('booking.summary.confirm')}
            </>
          )}
        </Button>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
