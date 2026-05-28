import { setRequestLocale, getTranslations } from 'next-intl/server';
import { CreditCard } from 'lucide-react';
import { requireUserOrRedirect } from '@/lib/auth/guards';
import { SettingsHeader } from '@/components/settings/SettingsHeader';

export default async function PaymentsSettings({
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
        title={t('settings.payments.title')}
        subtitle={t('settings.payments.subtitle')}
      />
      <div className="border-border bg-card grid gap-3 rounded-2xl border p-6 text-center shadow-sm">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <CreditCard className="text-muted-foreground h-5 w-5" aria-hidden />
        </div>
        <p className="text-sm font-medium">{t('settings.payments.empty')}</p>
        <p className="text-muted-foreground text-xs">{t('settings.payments.comingSoon')}</p>
      </div>
    </main>
  );
}
