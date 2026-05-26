import { setRequestLocale, getTranslations } from 'next-intl/server';
import { requireUserOrRedirect } from '@/lib/auth/guards';
import { AppointmentsList } from '@/components/appointments/AppointmentsList';

export default async function CustomerAppointmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUserOrRedirect(locale);
  const t = await getTranslations();

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">{t('appointments.title')}</h1>
      <AppointmentsList
        endpoint="/api/customers/me/appointments"
        hrefPrefix={`/${locale}/appointments`}
        locale={locale}
        perspective="customer"
      />
    </main>
  );
}
