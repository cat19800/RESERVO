import { setRequestLocale, getTranslations } from 'next-intl/server';

import { requireProfessionalOrRedirect } from '@/lib/auth/guards';
import { PremiumPanel } from '@/components/premium/PremiumPanel';

export default async function PremiumPage({
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
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        {t('pro.premium.title')}
      </h1>
      <p className="text-muted-foreground mb-6 text-sm">{t('pro.premium.subtitle')}</p>
      <PremiumPanel />
    </main>
  );
}
