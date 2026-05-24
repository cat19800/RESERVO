import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MapPin, Sparkles } from 'lucide-react';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { StarRating } from '@/components/shared/StarRating';
import { type ProCardDto } from '@/schemas/search';

type Props = { pro: ProCardDto; locale: string };

export function ProCard({ pro, locale }: Props) {
  const t = useTranslations();
  return (
    <Link
      href={`/${locale}/pros/${pro.id}`}
      className="border-border bg-card hover:bg-muted/40 focus-visible:ring-ring flex items-center gap-3 rounded-2xl border p-3 shadow-sm transition focus-visible:ring-2 focus-visible:outline-none"
    >
      <UserAvatar seed={pro.avatarSeed} displayName={pro.displayName} size={48} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{pro.displayName}</p>
          {pro.isPremium && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300"
              aria-label={t('pro.card.premiumBadge')}
            >
              <Sparkles className="h-2.5 w-2.5" aria-hidden />
              {t('pro.card.premiumBadge')}
            </span>
          )}
        </div>
        <p className="text-muted-foreground truncate text-xs">
          {pro.specialty ?? t(`categories.${pro.category}`)}
        </p>
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
    </Link>
  );
}
