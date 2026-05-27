import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';

import { requireUserOrRedirect } from '@/lib/auth/guards';
import { env } from '@/lib/env';
import { RemindersConsole } from '@/components/dev/RemindersConsole';

export default async function DevRemindersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (!env.DEV_TOOLS) notFound();

  const { locale } = await params;
  setRequestLocale(locale);
  await requireUserOrRedirect(locale);
  const t = await getTranslations();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        {t('dev.reminders.title')}
      </h1>
      <p className="text-muted-foreground mb-6 text-sm">{t('dev.reminders.subtitle')}</p>
      <RemindersConsole />
    </main>
  );
}
