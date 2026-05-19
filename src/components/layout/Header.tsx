import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { BellIcon } from '@/components/notifications/BellIcon';
import { LanguageSwitcher } from './LanguageSwitcher';
import { UserMenu } from './UserMenu';

export async function Header({ locale }: { locale: string }) {
  const t = await getTranslations();
  return (
    <header className="border-border bg-background/80 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link href={`/${locale}/home`} className="text-lg font-bold tracking-tight">
          {t('app.name')}
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <BellIcon locale={locale} />
          <UserMenu locale={locale} />
        </div>
      </div>
    </header>
  );
}
