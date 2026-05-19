import Link from 'next/link';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { SignInForm } from '@/components/auth/SignInForm';

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="grid gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t('auth.signIn.title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('auth.signIn.subtitle')}</p>
      </div>
      <SignInForm locale={locale} />
      <div className="text-muted-foreground text-center text-sm">
        {t('auth.signIn.noAccount')}{' '}
        <Link
          href={`/${locale}/sign-up`}
          className="text-primary font-medium underline-offset-4 hover:underline"
        >
          {t('auth.signIn.createOne')}
        </Link>
      </div>
    </div>
  );
}
