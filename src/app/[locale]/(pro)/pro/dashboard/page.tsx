import Link from 'next/link';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { BarChart3, Briefcase, Calendar, CalendarCheck, ChevronRight, ClipboardList, MapPin, Settings, Sparkles } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireProfessionalOrRedirect } from '@/lib/auth/guards';
import { isActivePremium } from '@/lib/premium';

export default async function ProDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireProfessionalOrRedirect(locale);
  const t = await getTranslations();

  const pro = await prisma.professional.findUnique({
    where: { id: user.professionalId },
    select: {
      displayName: true,
      category: true,
      city: true,
      services: { where: { active: true }, select: { id: true } },
      schedule: { select: { workingHours: { select: { id: true } } } },
      subscription: { select: { status: true, expiresAt: true } },
    },
  });

  if (!pro) return null;
  const isPremium = isActivePremium(pro.subscription);

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t('pro.dashboard.title', { name: pro.displayName })}
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">{t('pro.dashboard.subtitle')}</p>

      <div className="mt-6 grid gap-3">
        <DashboardTile
          icon={Briefcase}
          label={t('pro.dashboard.yourCategory')}
          value={t(`categories.${pro.category}`)}
        />
        <DashboardTile
          icon={MapPin}
          label={t('pro.dashboard.yourCity')}
          value={pro.city}
        />
        <DashboardTile
          icon={Calendar}
          label={t('pro.dashboard.servicesCount', { count: pro.services.length })}
          value={t('pro.dashboard.workingDaysCount', {
            count: pro.schedule?.workingHours.length ?? 0,
          })}
        />
      </div>

      <div className="mt-6 grid gap-2">
        <NavTile
          href={`/${locale}/pro/appointments`}
          icon={CalendarCheck}
          title={t('appointments.pro.title')}
          description={t('appointments.pro.manageDescription')}
        />
        <NavTile
          href={`/${locale}/pro/schedule`}
          icon={Calendar}
          title={t('pro.dashboard.manageSchedule')}
          description={t('pro.dashboard.manageScheduleDescription')}
        />
        <NavTile
          href={`/${locale}/pro/services`}
          icon={ClipboardList}
          title={t('pro.dashboard.manageServices')}
          description={t('pro.dashboard.manageServicesDescription')}
        />
        <NavTile
          href={`/${locale}/pro/analytics`}
          icon={BarChart3}
          title={t('pro.menu.analytics')}
          description={
            isPremium ? t('pro.analytics.subtitle') : t('pro.analytics.lockedTitle')
          }
        />
        <NavTile
          href={`/${locale}/pro/premium`}
          icon={Sparkles}
          title={t('pro.menu.premium')}
          description={isPremium ? t('pro.premium.active') : t('pro.premium.subtitle')}
        />
        <NavTile
          href={`/${locale}/pro/settings`}
          icon={Settings}
          title={t('proSettings.title')}
          description={t('proSettings.manageDescription')}
        />
      </div>
    </main>
  );
}

function NavTile({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Briefcase;
  title: string;
  description: string;
}) {
  return (
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
  );
}

function DashboardTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Briefcase;
  label: string;
  value: string;
}) {
  return (
    <div className="border-border bg-card flex items-center gap-3 rounded-2xl border p-4 shadow-sm">
      <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
