import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { requireUserOrRedirect } from '@/lib/auth/guards';

export default async function ProLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUserOrRedirect(locale);

  // Customers without a Professional row get bounced to onboarding.
  if (!user.professionalId) redirect(`/${locale}/become-professional`);

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
