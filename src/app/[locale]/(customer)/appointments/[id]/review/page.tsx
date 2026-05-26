import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { ChevronLeft } from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { requireUserOrRedirect } from '@/lib/auth/guards';
import { ReviewForm } from '@/components/reviews/ReviewForm';

export default async function WriteReviewPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requireUserOrRedirect(locale);
  const t = await getTranslations();

  const appt = await prisma.appointment.findUnique({
    where: { id },
    include: { review: true, service: true, professional: true },
  });
  if (!appt) notFound();
  if (!user.customerId || appt.customerId !== user.customerId) notFound();
  if (appt.status !== 'COMPLETED') {
    // Reviews only for completed appointments — bounce back.
    redirect(`/${locale}/appointments/${id}`);
  }

  const mode = appt.review ? 'edit' : 'create';

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={`/${locale}/appointments/${id}`}
          aria-label={t('common.back')}
          className="hover:bg-muted -ml-2 flex h-9 w-9 items-center justify-center rounded-full"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {mode === 'create' ? t('reviews.writeTitle') : t('reviews.editAction')}
          </h1>
          <p className="text-muted-foreground truncate text-sm">
            {appt.professional.displayName} · {appt.service.name}
          </p>
        </div>
      </div>
      <ReviewForm
        appointmentId={appt.id}
        locale={locale}
        mode={mode}
        initial={
          appt.review
            ? { rating: appt.review.rating, comment: appt.review.comment }
            : undefined
        }
      />
    </main>
  );
}
