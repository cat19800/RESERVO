import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { ChevronLeft, MapPin, Sparkles } from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { requireUserOrRedirect } from '@/lib/auth/guards';
import { isActivePremium } from '@/lib/premium';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { StarRating } from '@/components/shared/StarRating';
import { ReviewsList } from '@/components/reviews/ReviewsList';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function formatPrice(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'el' ? 'el-GR' : 'en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

export default async function ProPublicProfile({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireUserOrRedirect(locale);
  const t = await getTranslations();

  const pro = await prisma.professional.findUnique({
    where: { id },
    include: {
      user: { select: { profile: { select: { avatarSeed: true } } } },
      subscription: { select: { status: true, expiresAt: true } },
      services: {
        where: { active: true },
        orderBy: { createdAt: 'asc' },
      },
      schedule: {
        select: {
          workingHours: {
            select: { dayOfWeek: true, startTime: true, endTime: true },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
          },
        },
      },
    },
  });
  if (!pro) notFound();

  const avatarSeed = pro.user.profile?.avatarSeed ?? pro.id;
  const isPremium = isActivePremium(pro.subscription);

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <Link
        href={`/${locale}/search`}
        aria-label={t('common.back')}
        className="hover:bg-muted -ml-2 mb-4 flex h-9 w-9 items-center justify-center rounded-full"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </Link>

      {/* Header */}
      <header className="flex items-center gap-4">
        <UserAvatar seed={avatarSeed} displayName={pro.displayName} size={72} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight">{pro.displayName}</h1>
            {isPremium && (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300"
                aria-label={t('pro.card.premiumBadge')}
              >
                <Sparkles className="h-3 w-3" aria-hidden />
                {t('pro.card.premiumBadge')}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{t(`categories.${pro.category}`)}</Badge>
            {pro.specialty && (
              <span className="text-muted-foreground text-xs">{pro.specialty}</span>
            )}
          </div>
          <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden />
              {pro.city}
            </span>
            {pro.ratingCount > 0 ? (
              <StarRating value={pro.ratingAvg} count={pro.ratingCount} />
            ) : (
              <span className="italic">{t('search.noRatingsYet')}</span>
            )}
          </div>
        </div>
      </header>

      {pro.description && (
        <p className="text-muted-foreground mt-4 text-sm leading-relaxed">{pro.description}</p>
      )}

      {/* Address */}
      <p className="text-muted-foreground mt-4 text-xs">
        <span className="font-medium">{t('pros.profile.addressLabel')}:</span> {pro.address}
      </p>

      {/* Services */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold tracking-tight">
          {t('pros.profile.servicesTitle')}
        </h2>
        {pro.services.length === 0 ? (
          <div className="border-border bg-muted/30 rounded-2xl border border-dashed p-4 text-center">
            <p className="text-muted-foreground text-sm">{t('pros.profile.noServices')}</p>
          </div>
        ) : (
          <ul className="grid gap-2">
            {pro.services.map((s) => (
              <li
                key={s.id}
                className="border-border bg-card flex items-start justify-between gap-3 rounded-2xl border p-4 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{s.name}</p>
                  {s.description && (
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                      {s.description}
                    </p>
                  )}
                  <p className="text-muted-foreground mt-1 text-xs">
                    {t('pros.profile.durationDisplay', { minutes: s.durationMinutes })}
                  </p>
                </div>
                <p className="text-foreground shrink-0 text-sm font-semibold">
                  {s.priceCents === 0 ? t('pros.profile.priceFree') : formatPrice(s.priceCents, locale)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Schedule */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold tracking-tight">
          {t('pros.profile.scheduleTitle')}
        </h2>
        {!pro.schedule || pro.schedule.workingHours.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('pros.profile.scheduleEmpty')}</p>
        ) : (
          <ul className="grid gap-1 text-sm">
            {pro.schedule.workingHours.map((wh) => (
              <li key={`${wh.dayOfWeek}-${wh.startTime}`} className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t(`days.long.${wh.dayOfWeek}` as 'days.long.0')}
                </span>
                <span className="font-medium">
                  {wh.startTime} – {wh.endTime}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Reviews */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold tracking-tight">
          {t('pros.profile.reviewsTitle')}
        </h2>
        <ReviewsList professionalId={pro.id} />
      </section>

      {/* Book CTA — wired up in Phase 6 */}
      <div className="sticky bottom-4 mt-8">
        <Link
          href={`/${locale}/pros/${pro.id}/book`}
          className={buttonVariants({ size: 'lg', className: 'w-full' })}
        >
          {t('pros.profile.bookCta')}
        </Link>
      </div>
    </main>
  );
}
