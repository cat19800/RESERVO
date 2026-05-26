'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { type ApiResult, isFailure } from '@/types/api';
import { type AppointmentDto } from '@/schemas/booking';
import { AppointmentCard } from './AppointmentCard';
import { buttonVariants } from '@/components/ui/button';

type Tab = 'upcoming' | 'past' | 'cancelled';

async function fetchList(endpoint: string): Promise<AppointmentDto[]> {
  const res = await fetch(endpoint, { credentials: 'include' });
  const json = (await res.json()) as ApiResult<AppointmentDto[]>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

export function AppointmentsList({
  endpoint,
  hrefPrefix,
  locale,
  perspective,
}: {
  endpoint: string;
  /** e.g. `/${locale}/appointments` or `/${locale}/pro/appointments`. */
  hrefPrefix: string;
  locale: string;
  perspective: 'customer' | 'professional';
}) {
  const t = useTranslations();
  const [tab, setTab] = useState<Tab>('upcoming');

  const { data: items = [], isLoading } = useQuery({
    queryKey: [perspective, 'appointments'],
    queryFn: () => fetchList(endpoint),
  });

  // Bucket purely by status to keep the render pure (react-hooks/purity bans
  // Date.now() during render). Past-but-still-CONFIRMED appointments will be
  // flipped to COMPLETED by the cron tick in Phase 10.
  const { upcoming, past, cancelled } = useMemo(
    () => ({
      upcoming: items.filter((a) => a.status === 'HELD' || a.status === 'CONFIRMED'),
      past: items.filter((a) => a.status === 'COMPLETED'),
      cancelled: items.filter((a) => a.status === 'CANCELLED'),
    }),
    [items],
  );

  function renderList(list: AppointmentDto[]) {
    if (isLoading) {
      return <p className="text-muted-foreground text-sm">{t('common.loading')}</p>;
    }
    if (list.length === 0) {
      return (
        <div className="border-border bg-muted/30 rounded-2xl border border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">{t('appointments.empty')}</p>
          {perspective === 'customer' && (
            <Link
              href={`/${locale}/search`}
              className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-3' })}
            >
              {t('appointments.exploreCta')}
            </Link>
          )}
        </div>
      );
    }
    return (
      <ul className="grid gap-2">
        {list.map((a) => (
          <li key={a.id}>
            <AppointmentCard
              appointment={a}
              href={`${hrefPrefix}/${a.id}`}
              perspective={perspective}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="upcoming">{t('appointments.tabs.upcoming')}</TabsTrigger>
        <TabsTrigger value="past">{t('appointments.tabs.past')}</TabsTrigger>
        <TabsTrigger value="cancelled">{t('appointments.tabs.cancelled')}</TabsTrigger>
      </TabsList>
      <TabsContent value="upcoming" className="mt-4">
        {renderList(upcoming)}
      </TabsContent>
      <TabsContent value="past" className="mt-4">
        {renderList(past)}
      </TabsContent>
      <TabsContent value="cancelled" className="mt-4">
        {renderList(cancelled)}
      </TabsContent>
    </Tabs>
  );
}
