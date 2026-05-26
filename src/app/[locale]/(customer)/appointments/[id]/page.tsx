import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations, getFormatter } from 'next-intl/server';
import { ChevronLeft, MapPin, Star } from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { requireUserOrRedirect } from '@/lib/auth/guards';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { HoldActions } from '@/components/appointments/HoldActions';
import { AppointmentActions } from '@/components/appointments/AppointmentActions';

const APP_TZ = 'Europe/Athens';

function formatPrice(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'el' ? 'el-GR' : 'en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

export default async function CustomerAppointmentDetail({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requireUserOrRedirect(locale);
  const t = await getTranslations();
  const fmt = await getFormatter();

  const appt = await prisma.appointment.findUnique({
    where: { id },
    include: {
      professional: { include: { user: { include: { profile: true } } } },
      service: true,
      review: true,
    },
  });
  if (!appt) notFound();

  // Customers can only see their own appointments here.
  if (!user.customerId || appt.customerId !== user.customerId) notFound();

  const proAvatar = appt.professional.user.profile?.avatarSeed ?? appt.professional.id;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <Link
        href={`/${locale}/appointments`}
        aria-label={t('common.back')}
        className="hover:bg-muted -ml-2 mb-4 flex h-9 w-9 items-center justify-center rounded-full"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </Link>

      <header className="flex items-center gap-3">
        <UserAvatar
          seed={proAvatar}
          displayName={appt.professional.displayName}
          size={56}
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {appt.professional.displayName}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {t(`appointments.status.${appt.status}` as 'appointments.status.HELD')}
            </Badge>
            <span className="text-muted-foreground text-xs">
              {t(`categories.${appt.professional.category}` as 'categories.DOCTOR')}
            </span>
          </div>
        </div>
      </header>

      <div className="border-border bg-card mt-6 grid gap-3 rounded-2xl border p-4 shadow-sm">
        <Row
          label={t('appointments.detail.serviceLabel')}
          value={appt.service.name}
        />
        <Row
          label={t('appointments.detail.whenLabel')}
          value={fmt.dateTime(appt.startsAt, {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: APP_TZ,
          })}
        />
        <Row
          label={t('appointments.detail.durationLabel')}
          value={t('pros.profile.durationDisplay', { minutes: appt.service.durationMinutes })}
        />
        <Row
          label={t('appointments.detail.priceLabel')}
          value={
            appt.service.priceCents === 0
              ? t('pros.profile.priceFree')
              : formatPrice(appt.service.priceCents, locale)
          }
        />
        <Row
          label={t('appointments.detail.addressLabel')}
          value={
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden />
              {appt.professional.city}, {appt.professional.address}
            </span>
          }
        />
      </div>

      {appt.status === 'HELD' && appt.tentativeUntil && (
        <p className="text-muted-foreground mt-4 text-xs italic">
          {t('booking.summary.holdLabel', {
            until: fmt.dateTime(appt.tentativeUntil, {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: APP_TZ,
            }),
          })}
        </p>
      )}

      {appt.status === 'HELD' && (
        <div className="mt-6">
          <HoldActions id={appt.id} locale={locale} />
        </div>
      )}

      {appt.status === 'CONFIRMED' && (
        <div className="mt-6">
          <AppointmentActions id={appt.id} locale={locale} variant="customer" />
        </div>
      )}

      {appt.status === 'CANCELLED' && appt.cancelledAt && (
        <div className="border-border bg-muted/30 mt-6 rounded-2xl border p-4 text-sm">
          <p>
            {t('appointments.detail.cancelledOn', {
              date: fmt.dateTime(appt.cancelledAt, {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: APP_TZ,
              }),
            })}
            {appt.cancelledBy && (
              <>
                {' '}
                <span className="text-muted-foreground">
                  ({t(`appointments.cancelledBy.${appt.cancelledBy}` as 'appointments.cancelledBy.CUSTOMER')})
                </span>
              </>
            )}
          </p>
          {appt.cancellationReason && (
            <p className="text-muted-foreground mt-1 text-xs">
              {t('appointments.detail.cancelReason')}: {appt.cancellationReason}
            </p>
          )}
        </div>
      )}

      {appt.status === 'COMPLETED' && (
        <div className="mt-6">
          <Link
            href={`/${locale}/appointments/${appt.id}/review`}
            className={buttonVariants({ variant: appt.review ? 'outline' : 'default' })}
          >
            <Star className="mr-2 h-4 w-4" aria-hidden />
            {appt.review ? t('reviews.editAction') : t('reviews.writeAction')}
          </Link>
        </div>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
