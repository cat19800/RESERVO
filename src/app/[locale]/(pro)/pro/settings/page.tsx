import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';

import { requireProfessionalOrRedirect } from '@/lib/auth/guards';
import { CancellationRulesForm } from '@/components/pro/CancellationRulesForm';

export default async function ProSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireProfessionalOrRedirect(locale);
  const t = await getTranslations();

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/${locale}/pro/dashboard`}
          aria-label={t('common.back')}
          className="hover:bg-muted -ml-2 flex h-9 w-9 items-center justify-center rounded-full"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {t('proSettings.title')}
          </h1>
          <p className="text-muted-foreground truncate text-sm">{t('proSettings.subtitle')}</p>
        </div>
      </div>

      <section className="grid gap-4">
        <header>
          <h2 className="text-lg font-semibold tracking-tight">
            {t('proSettings.cancellationRules.title')}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t('proSettings.cancellationRules.subtitle')}
          </p>
        </header>
        <CancellationRulesForm />
      </section>
    </main>
  );
}
