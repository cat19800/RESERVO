import Link from 'next/link';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Briefcase, ChevronRight, Settings } from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { requireUserOrRedirect } from '@/lib/auth/guards';
import { isActivePremium } from '@/lib/premium';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { CategoryGrid } from '@/components/search/CategoryGrid';
import { SearchBar } from '@/components/search/SearchBar';
import { ProCard } from '@/components/search/ProCard';
import { type ProCardDto } from '@/schemas/search';
import { buttonVariants } from '@/components/ui/button';

export default async function CustomerHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUserOrRedirect(locale);
  const t = await getTranslations();

  const name = user.profile?.firstName ?? user.email;
  const fullName = user.profile && `${user.profile.firstName} ${user.profile.lastName}`;

  const recommended = await prisma.professional.findMany({
    orderBy: [
      { subscription: { status: 'asc' } },
      { ratingAvg: 'desc' },
      { ratingCount: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 4,
    select: {
      id: true,
      displayName: true,
      category: true,
      specialty: true,
      city: true,
      ratingAvg: true,
      ratingCount: true,
      user: { select: { profile: { select: { avatarSeed: true } } } },
      subscription: { select: { status: true, expiresAt: true } },
    },
  });

  const recommendedDtos: ProCardDto[] = recommended.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    category: p.category,
    specialty: p.specialty,
    city: p.city,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    avatarSeed: p.user.profile?.avatarSeed ?? p.id,
    isPremium: isActivePremium(p.subscription),
  }));

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      {/* Greeting */}
      <header className="mb-6 flex items-center gap-3">
        <UserAvatar
          seed={user.profile?.avatarSeed ?? user.email}
          displayName={fullName ?? user.email}
          size={48}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold tracking-tight">
            {t('shell.home.greeting', { name })}
          </p>
          <p className="text-muted-foreground truncate text-xs">{t('shell.home.subtitle')}</p>
        </div>
      </header>

      {/* Search */}
      <div className="mb-6">
        <SearchBar locale={locale} />
      </div>

      {/* Categories */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold tracking-tight">
          {t('shell.home.categoriesTitle')}
        </h2>
        <CategoryGrid locale={locale} />
      </section>

      {/* Recommended */}
      <section className="mb-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight">
            {t('shell.home.recommendedTitle')}
          </h2>
          {recommendedDtos.length > 0 && (
            <Link
              href={`/${locale}/search`}
              className="text-primary text-xs font-medium underline-offset-4 hover:underline"
            >
              {t('shell.home.seeAll')}
            </Link>
          )}
        </div>
        {recommendedDtos.length === 0 ? (
          <div className="border-border bg-muted/30 rounded-2xl border border-dashed p-6 text-center">
            <p className="text-muted-foreground text-sm">{t('shell.home.recommendedEmpty')}</p>
          </div>
        ) : (
          <ul className="grid gap-2">
            {recommendedDtos.map((p) => (
              <li key={p.id}>
                <ProCard pro={p} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Become-a-pro CTA (only for non-pros) */}
      {!user.professionalId && (
        <Link
          href={`/${locale}/become-professional`}
          className="border-primary/30 bg-primary/5 hover:bg-primary/10 focus-visible:ring-ring mb-6 flex items-center gap-4 rounded-2xl border p-4 shadow-sm transition focus-visible:ring-2 focus-visible:outline-none"
        >
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <Briefcase className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{t('shell.home.becomeProCta')}</p>
            <p className="text-muted-foreground text-xs">{t('shell.home.becomeProDescription')}</p>
          </div>
          <ChevronRight className="text-muted-foreground h-4 w-4" aria-hidden />
        </Link>
      )}

      {/* Settings shortcut */}
      <Link
        href={`/${locale}/settings`}
        className={buttonVariants({ variant: 'outline', size: 'lg' })}
      >
        <Settings className="mr-2 h-4 w-4" aria-hidden />
        {t('shell.home.openSettings')}
      </Link>
    </main>
  );
}
