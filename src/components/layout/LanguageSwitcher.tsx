'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { routing } from '@/i18n/routing';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const labels: Record<string, string> = { el: 'ΕΛ', en: 'EN' };

export function LanguageSwitcher() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();

  function switchTo(target: string) {
    if (target === currentLocale) return;
    // Replace the leading `/${currentLocale}` segment with the target locale.
    const next = pathname.replace(new RegExp(`^/${currentLocale}(?=/|$)`), `/${target}`);
    router.push(next);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('common.languageSwitcher')}
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'font-medium')}
      >
        {labels[currentLocale] ?? currentLocale.toUpperCase()}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => switchTo(loc)}
            data-active={loc === currentLocale}
          >
            {labels[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
