import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/auth/guards';

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // If you're already signed in, the auth screens are not for you.
  const user = await getSessionUser();
  if (user) redirect(`/${locale}/home`);

  return (
    <main className="bg-muted flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="bg-card w-full max-w-sm rounded-2xl border p-6 shadow-sm sm:p-8">
        {children}
      </div>
    </main>
  );
}
