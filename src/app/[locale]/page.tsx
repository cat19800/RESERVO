import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/auth/guards';

export default async function LocaleRoot({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getSessionUser();
  redirect(user ? `/${locale}/home` : `/${locale}/sign-in`);
}
