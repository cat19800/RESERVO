import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { ChevronLeft } from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { requireUserOrRedirect } from '@/lib/auth/guards';
import { RescheduleFlow } from '@/components/appointments/RescheduleFlow';

export default async function ReschedulePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requireUserOrRedirect(locale);
  const t = await getTranslations();

  const appt = await prisma.appointment.findUnique({
    where: { id },
    include: { service: true },
  });
  if (!appt) notFound();
  if (!user.customerId || appt.customerId !== user.customerId) notFound();
  // Reschedule only makes sense for CONFIRMED appointments.
  if (appt.status !== 'CONFIRMED') notFound();

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={`/${locale}/appointments/${id}`}
          aria-label={t('common.back')}
          className="hover:bg-muted -ml-2 flex h-9 w-9 items-center justify-center rounded-full"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {t('appointments.detail.reschedule')}
          </h1>
          <p className="text-muted-foreground truncate text-sm">
            {t('appointments.detail.rescheduleSubtitle')}
          </p>
        </div>
      </div>
      <RescheduleFlow
        appointmentId={appt.id}
        professionalId={appt.professionalId}
        serviceId={appt.serviceId}
        serviceName={appt.service.name}
        serviceDurationMinutes={appt.service.durationMinutes}
        locale={locale}
        initialStartsAt={appt.startsAt.toISOString()}
      />
    </main>
  );
}
