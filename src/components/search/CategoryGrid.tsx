import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Stethoscope, Dumbbell, Scissors, Sparkles, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { key: 'DOCTOR', icon: Stethoscope, accent: 'bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  { key: 'GYM', icon: Dumbbell, accent: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  { key: 'HAIR_SALON', icon: Scissors, accent: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
  { key: 'BEAUTY_CARE', icon: Sparkles, accent: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
] as const;

export function CategoryGrid({ locale }: { locale: string }) {
  const t = useTranslations();
  return (
    <div className="grid grid-cols-2 gap-3">
      {CATEGORIES.map((c) => (
        <CategoryTile
          key={c.key}
          href={`/${locale}/search?category=${c.key}`}
          label={t(`categories.${c.key}` as 'categories.DOCTOR')}
          icon={c.icon}
          accent={c.accent}
        />
      ))}
    </div>
  );
}

function CategoryTile({
  href,
  label,
  icon: Icon,
  accent,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="border-border bg-card hover:bg-muted/40 focus-visible:ring-ring flex flex-col items-start gap-2 rounded-2xl border p-4 shadow-sm transition focus-visible:ring-2 focus-visible:outline-none"
    >
      <span
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl',
          accent,
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
