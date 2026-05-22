import Link from 'next/link';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Bell, CreditCard, ChevronRight, UserRound } from 'lucide-react';
import { requireUserOrRedirect } from '@/lib/auth/guards';

export default async function SettingsIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUserOrRedirect(locale);
  const t = await getTranslations();

  const items = [
    {
      href: `/${locale}/settings/profile`,
      icon: UserRound,
      title: t('settings.tabs.profile'),
      description: t('settings.tabs.profileDescription'),
    },
    {
      href: `/${locale}/settings/notifications`,
      icon: Bell,
      title: t('settings.tabs.notifications'),
      description: t('settings.tabs.notificationsDescription'),
    },
    {
      href: `/${locale}/settings/payments`,
      icon: CreditCard,
      title: t('settings.tabs.payments'),
      description: t('settings.tabs.paymentsDescription'),
    },
  ];

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('settings.subtitle')}</p>
      </div>
      <ul className="grid gap-2">
        {items.map(({ href, icon: Icon, title, description }) => (
          <li key={href}>
            <Link
              href={href}
              className="border-border bg-card hover:bg-muted/50 focus-visible:ring-ring flex items-center gap-4 rounded-2xl border p-4 shadow-sm transition focus-visible:ring-2 focus-visible:outline-none"
            >
              <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{title}</p>
                <p className="text-muted-foreground truncate text-xs">{description}</p>
              </div>
              <ChevronRight className="text-muted-foreground h-4 w-4" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
