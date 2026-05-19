import Link from 'next/link';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { SignUpForm } from '@/components/auth/SignUpForm';

export default async function SignUpPage({
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
        <h1 className="text-2xl font-semibold tracking-tight">{t('auth.signUp.title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('auth.signUp.subtitle')}</p>
      </div>
      <SignUpForm locale={locale} />
      <div className="text-muted-foreground text-center text-sm">
        {t('auth.signUp.haveAccount')}{' '}
        <Link
          href={`/${locale}/sign-in`}
          className="text-primary font-medium underline-offset-4 hover:underline"
        >
          {t('auth.signUp.signInLink')}
        </Link>
      </div>
    </div>
  );
}
