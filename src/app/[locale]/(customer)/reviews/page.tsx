import Link from 'next/link';
import { setRequestLocale, getTranslations, getFormatter } from 'next-intl/server';

import { prisma } from '@/lib/prisma';
import { requireUserOrRedirect } from '@/lib/auth/guards';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { StarRating } from '@/components/shared/StarRating';
import { buttonVariants } from '@/components/ui/button';

export default async function MyReviewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUserOrRedirect(locale);
  const t = await getTranslations();
  const fmt = await getFormatter();

  if (!user.customerId) return null;

  const reviews = await prisma.review.findMany({
    where: { customerId: user.customerId },
    include: {
      professional: { include: { user: { include: { profile: true } } } },
      appointment: { include: { service: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">{t('reviews.myTitle')}</h1>
      <p className="text-muted-foreground mb-6 text-sm">{t('reviews.mySubtitle')}</p>

      {reviews.length === 0 ? (
        <div className="border-border bg-muted/30 rounded-2xl border border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">{t('reviews.myEmpty')}</p>
          <Link
            href={`/${locale}/appointments`}
            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-3' })}
          >
            {t('appointments.title')}
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3">
          {reviews.map((r) => {
            const proAvatar = r.professional.user.profile?.avatarSeed ?? r.professional.id;
            return (
              <li
                key={r.id}
                className="border-border bg-card grid gap-2 rounded-2xl border p-4 shadow-sm"
              >
                <Link
                  href={`/${locale}/appointments/${r.appointmentId}/review`}
                  className="grid gap-2"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      seed={proAvatar}
                      displayName={r.professional.displayName}
                      size={36}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {r.professional.displayName}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {r.appointment.service.name} ·{' '}
                        {fmt.dateTime(r.createdAt, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <StarRating value={r.rating} size={14} />
                  </div>
                  {r.comment && (
                    <p className="text-muted-foreground line-clamp-3 text-sm">{r.comment}</p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
