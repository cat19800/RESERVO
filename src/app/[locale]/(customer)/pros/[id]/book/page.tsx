import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { requireUserOrRedirect } from '@/lib/auth/guards';
import { isActivePremium } from '@/lib/premium';
import { type ProProfileDto } from '@/schemas/search';
import { BookingFlow } from '@/components/booking/BookingFlow';

export default async function BookingPage({
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
        select: {
          id: true,
          name: true,
          description: true,
          durationMinutes: true,
          priceCents: true,
        },
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

  const dto: ProProfileDto = {
    id: pro.id,
    displayName: pro.displayName,
    category: pro.category,
    specialty: pro.specialty,
    city: pro.city,
    address: pro.address,
    ratingAvg: pro.ratingAvg,
    ratingCount: pro.ratingCount,
    description: pro.description,
    avatarSeed: pro.user.profile?.avatarSeed ?? pro.id,
    isPremium: isActivePremium(pro.subscription),
    services: pro.services,
    workingHours: pro.schedule?.workingHours ?? [],
  };

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={`/${locale}/pros/${pro.id}`}
          aria-label={t('common.back')}
          className="hover:bg-muted -ml-2 flex h-9 w-9 items-center justify-center rounded-full"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {t('booking.title')}
          </h1>
          <p className="text-muted-foreground truncate text-sm">
            {t('booking.withPro', { pro: pro.displayName })}
          </p>
        </div>
      </div>
      <BookingFlow pro={dto} locale={locale} />
    </main>
  );
}
