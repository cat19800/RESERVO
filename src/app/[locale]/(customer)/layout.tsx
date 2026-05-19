import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { requireUserOrRedirect } from '@/lib/auth/guards';

export default async function CustomerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUserOrRedirect(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
