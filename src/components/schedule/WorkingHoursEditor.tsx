'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { type ApiResult, isFailure } from '@/types/api';
import { type ScheduleResponse, type ScheduleUpdateInput } from '@/schemas/schedule';

const DAYS_ORDER = [1, 2, 3, 4, 5, 6, 0] as const; // Mon..Sat then Sun
type DayValue = { open: boolean; startTime: string; endTime: string };
type DayState = Record<number, DayValue>;

const EMPTY_DAY: DayValue = { open: false, startTime: '09:00', endTime: '17:00' };

async function getSchedule(): Promise<ScheduleResponse> {
  const res = await fetch('/api/professionals/me/schedule', { credentials: 'include' });
  const json = (await res.json()) as ApiResult<ScheduleResponse>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

async function putSchedule(input: ScheduleUpdateInput): Promise<ScheduleResponse> {
  const res = await fetch('/api/professionals/me/schedule', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResult<ScheduleResponse>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

function fromResponse(r: ScheduleResponse): DayState {
  const out: DayState = {};
  for (let d = 0; d <= 6; d++) out[d] = { ...EMPTY_DAY };
  for (const wh of r.workingHours) {
    out[wh.dayOfWeek] = { open: true, startTime: wh.startTime, endTime: wh.endTime };
  }
  return out;
}

function toUpdate(state: DayState): ScheduleUpdateInput {
  return {
    workingHours: DAYS_ORDER.flatMap((d) => {
      const v = state[d];
      return v.open ? [{ dayOfWeek: d, startTime: v.startTime, endTime: v.endTime }] : [];
    }),
  };
}

export function WorkingHoursEditor() {
  const t = useTranslations();
  const qc = useQueryClient();
  const [state, setState] = useState<DayState | null>(null);
  const [snapshot, setSnapshot] = useState<ScheduleResponse | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['pro', 'schedule'], queryFn: getSchedule });

  // Sync local edit-state when fresh data lands. Setting state during render is
  // the React-recommended way to derive state from changing inputs, as long as
  // we only do it when the input actually changed (vs. mirroring in useEffect,
  // which produces an extra render and runs into react-hooks/set-state-in-effect).
  if (data && data !== snapshot) {
    setSnapshot(data);
    setState(fromResponse(data));
  }

  const mutation = useMutation({
    mutationFn: putSchedule,
    onSuccess: (next) => {
      qc.setQueryData(['pro', 'schedule'], next);
      setState(fromResponse(next));
      setSavedAt(Date.now());
      setError(null);
    },
    onError: () => setError(t('auth.errors.INTERNAL_ERROR')),
  });

  if (isLoading || !state) return <p className="text-muted-foreground text-sm">{t('common.loading')}</p>;

  function update(day: number, patch: Partial<DayValue>) {
    setState((prev) => (prev ? { ...prev, [day]: { ...prev[day], ...patch } } : prev));
    setSavedAt(null);
    setError(null);
  }

  function save() {
    if (!state) return;
    // Client-side validation: every open day must have endTime > startTime.
    for (const d of DAYS_ORDER) {
      const v = state[d];
      if (v.open && v.startTime >= v.endTime) {
        setError(t('pro.schedule.errors.endBeforeStart'));
        return;
      }
    }
    mutation.mutate(toUpdate(state));
  }

  return (
    <section className="grid gap-4">
      <header>
        <h2 className="text-lg font-semibold tracking-tight">
          {t('pro.schedule.workingHours.title')}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t('pro.schedule.workingHours.subtitle')}
        </p>
      </header>
      <div className="grid gap-2">
        {DAYS_ORDER.map((day) => {
          const v = state[day];
          return (
            <div
              key={day}
              className="border-border bg-card flex flex-wrap items-center gap-3 rounded-2xl border p-3 shadow-sm"
            >
              <span className="w-20 text-sm font-medium">
                {t(`days.long.${day}` as 'days.long.0')}
              </span>
              <div className="flex items-center gap-2">
                <Switch
                  checked={v.open}
                  onCheckedChange={(open) => update(day, { open })}
                  aria-label={t('pro.schedule.workingHours.openLabel')}
                />
                <span className="text-muted-foreground text-xs">
                  {v.open
                    ? t('pro.schedule.workingHours.openLabel')
                    : t('pro.schedule.workingHours.closedLabel')}
                </span>
              </div>
              {v.open && (
                <div className="ml-auto flex items-center gap-2">
                  <Input
                    type="time"
                    value={v.startTime}
                    onChange={(e) => update(day, { startTime: e.target.value })}
                    className="w-28"
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    type="time"
                    value={v.endTime}
                    onChange={(e) => update(day, { endTime: e.target.value })}
                    className="w-28"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-3 pt-1">
        {error && <p className="text-destructive text-sm">{error}</p>}
        {savedAt && !mutation.isPending && !error && (
          <p className="text-accent text-sm">{t('pro.schedule.workingHours.saved')}</p>
        )}
        <Button onClick={save} disabled={mutation.isPending} className="ml-auto">
          {mutation.isPending ? t('common.saving') : t('pro.schedule.workingHours.saveAll')}
        </Button>
      </div>
    </section>
  );
}
