import Link from 'next/link';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Lock } from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { requireProfessionalOrRedirect } from '@/lib/auth/guards';
import { isActivePremium } from '@/lib/premium';
import { buttonVariants } from '@/components/ui/button';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireProfessionalOrRedirect(locale);
  const t = await getTranslations();

  const sub = await prisma.subscription.findUnique({
    where: { professionalId: user.professionalId },
    select: { status: true, expiresAt: true },
  });
  const isPremium = isActivePremium(sub);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        {t('pro.analytics.title')}
      </h1>
      <p className="text-muted-foreground mb-6 text-sm">{t('pro.analytics.subtitle')}</p>

      {isPremium ? (
        <AnalyticsDashboard />
      ) : (
        <div className="border-border bg-muted/30 grid gap-3 rounded-2xl border border-dashed p-6 text-center">
          <div className="bg-background mx-auto flex h-12 w-12 items-center justify-center rounded-full">
            <Lock className="text-muted-foreground h-6 w-6" aria-hidden />
          </div>
          <h2 className="text-base font-semibold tracking-tight">
            {t('pro.analytics.lockedTitle')}
          </h2>
          <p className="text-muted-foreground text-sm">{t('pro.analytics.lockedBody')}</p>
          <Link
            href={`/${locale}/pro/premium`}
            className={buttonVariants({ size: 'sm', className: 'justify-self-center' })}
          >
            {t('pro.analytics.lockedCta')}
          </Link>
        </div>
      )}
    </main>
  );
}
