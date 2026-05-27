import { setRequestLocale, getTranslations } from 'next-intl/server';
import { requireUserOrRedirect } from '@/lib/auth/guards';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { NotificationSettingsForm } from '@/components/settings/NotificationSettingsForm';

export default async function NotificationsSettings({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUserOrRedirect(locale);
  const t = await getTranslations();

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8">
      <SettingsHeader
        locale={locale}
        title={t('settings.notifications.title')}
        subtitle={t('settings.notifications.subtitle')}
      />
      <NotificationSettingsForm />
    </main>
  );
}
