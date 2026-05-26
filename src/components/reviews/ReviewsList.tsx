'use client';

import { useQuery } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';

import { type ApiResult, isFailure } from '@/types/api';
import { type ReviewDto } from '@/schemas/review';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { StarPicker } from './StarPicker';

async function fetchReviews(professionalId: string): Promise<ReviewDto[]> {
  const res = await fetch(`/api/pros/${professionalId}/reviews`, { credentials: 'include' });
  const json = (await res.json()) as ApiResult<ReviewDto[]>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

export function ReviewsList({ professionalId }: { professionalId: string }) {
  const t = useTranslations();
  const fmt = useFormatter();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['pros', professionalId, 'reviews'],
    queryFn: () => fetchReviews(professionalId),
  });

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t('common.loading')}</p>;
  }

  if (items.length === 0) {
    return (
      <div className="border-border bg-muted/30 rounded-2xl border border-dashed p-4 text-center">
        <p className="text-muted-foreground text-sm">{t('pros.profile.reviewsEmpty')}</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3">
      {items.map((r) => {
        const name = `${r.customer.firstName} ${r.customer.lastName}`.trim();
        return (
          <li
            key={r.id}
            className="border-border bg-card grid gap-2 rounded-2xl border p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <UserAvatar
                seed={r.customer.avatarSeed}
                displayName={name || 'Customer'}
                size={32}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{name || t('common.email')}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {r.service.name} ·{' '}
                  {fmt.dateTime(new Date(r.createdAt), {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <StarPicker
                value={r.rating}
                onChange={() => {}}
                readOnly
                size={16}
                ariaLabel={t('reviews.ratingLabel')}
              />
            </div>
            {r.comment && <p className="text-sm">{r.comment}</p>}
          </li>
        );
      })}
    </ul>
  );
}
