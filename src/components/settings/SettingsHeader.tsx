import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function SettingsHeader({
  locale,
  title,
  subtitle,
}: {
  locale: string;
  title: string;
  subtitle?: string;
}) {
  const t = await getTranslations();
  return (
    <div className="mb-6 flex items-center gap-3">
      <Link
        href={`/${locale}/settings`}
        aria-label={t('common.back')}
        className="hover:bg-muted -ml-2 flex h-9 w-9 items-center justify-center rounded-full"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </Link>
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground truncate text-sm">{subtitle}</p>}
      </div>
    </div>
  );
}
