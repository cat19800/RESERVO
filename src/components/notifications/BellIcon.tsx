'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Bell, CheckCheck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSession } from '@/hooks/useSession';
import {
  useMarkAllRead,
  useNotifications,
} from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { NotificationItem } from './NotificationItem';

const POPOVER_LIMIT = 5;

export function BellIcon({ locale }: { locale: string }) {
  const t = useTranslations();
  const { data: user } = useSession();
  const enabled = Boolean(user);
  const { data } = useNotifications(enabled);
  const markAll = useMarkAllRead();
  const [open, setOpen] = useState(false);

  if (!enabled) return null;

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;
  const preview = items.slice(0, POPOVER_LIMIT);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={t('notifications.bellLabel')}
        className={cn(
          'hover:bg-muted focus-visible:ring-ring focus-visible:ring-offset-background relative flex h-9 w-9 items-center justify-center rounded-full transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        )}
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <span
            className="bg-primary text-primary-foreground absolute top-1 right-1 grid h-4 min-w-[1rem] place-items-center rounded-full px-1 text-[10px] font-semibold leading-none"
            aria-label={t('notifications.unreadBadge', { count: unread })}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0">
        <div className="border-border flex items-center justify-between gap-2 border-b px-3 py-2">
          <p className="text-sm font-semibold">{t('notifications.popoverTitle')}</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded text-xs font-medium transition focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden />
              {t('notifications.markAllRead')}
            </button>
          )}
        </div>

        {preview.length === 0 ? (
          <p className="text-muted-foreground px-3 py-6 text-center text-sm">
            {t('notifications.empty')}
          </p>
        ) : (
          <ul className="grid max-h-96 gap-0.5 overflow-y-auto p-1">
            {preview.map((n) => (
              <li key={n.id}>
                <NotificationItem
                  notification={n}
                  locale={locale}
                  onAfterClick={() => setOpen(false)}
                />
              </li>
            ))}
          </ul>
        )}

        <div className="border-border border-t p-2">
          <Link
            href={`/${locale}/notifications`}
            onClick={() => setOpen(false)}
            className="hover:bg-muted block rounded-md px-2 py-1.5 text-center text-xs font-medium"
          >
            {t('notifications.viewAll')}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
