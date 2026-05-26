import { redirect } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { requireUserOrRedirect } from '@/lib/auth/guards';
import { Wizard } from '@/components/become-professional/Wizard';

export default async function BecomeProfessionalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUserOrRedirect(locale);

  // Already a pro? Skip the wizard.
  if (user.professionalId) redirect(`/${locale}/pro/dashboard`);

  const t = await getTranslations();

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        {t('becomeProfessional.title')}
      </h1>
      <Wizard locale={locale} />
    </main>
  );
}
