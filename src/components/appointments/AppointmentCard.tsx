import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { ChevronRight } from 'lucide-react';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { type AppointmentDto } from '@/schemas/booking';
import { cn } from '@/lib/utils';

const APP_TZ = 'Europe/Athens';

const STATUS_VARIANT: Record<AppointmentDto['status'], string> = {
  HELD: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  CONFIRMED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  CANCELLED: 'bg-muted text-muted-foreground',
  COMPLETED: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
};

export function AppointmentCard({
  appointment,
  href,
  perspective,
}: {
  appointment: AppointmentDto;
  href: string;
  perspective: 'customer' | 'professional';
}) {
  const t = useTranslations();
  const fmt = useFormatter();
  const a = appointment;

  const counterparty =
    perspective === 'customer'
      ? { name: a.professional.displayName, seed: a.professional.avatarSeed }
      : {
          name: `${a.customer.firstName} ${a.customer.lastName}`.trim() || t('common.email'),
          seed: a.customer.avatarSeed,
        };

  return (
    <Link
      href={href}
      className="border-border bg-card hover:bg-muted/40 focus-visible:ring-ring flex items-center gap-3 rounded-2xl border p-3 shadow-sm transition focus-visible:ring-2 focus-visible:outline-none"
    >
      <UserAvatar seed={counterparty.seed} displayName={counterparty.name} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">{counterparty.name}</p>
          <Badge variant="outline" className={cn('text-[10px]', STATUS_VARIANT[a.status])}>
            {t(`appointments.status.${a.status}` as 'appointments.status.HELD')}
          </Badge>
        </div>
        <p className="text-muted-foreground truncate text-xs">{a.service.name}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {fmt.dateTime(new Date(a.startsAt), {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: APP_TZ,
          })}
        </p>
      </div>
      <ChevronRight className="text-muted-foreground h-4 w-4" aria-hidden />
    </Link>
  );
}
