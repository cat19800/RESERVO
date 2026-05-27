'use client';

import { useTranslations } from 'next-intl';
import { CheckCheck } from 'lucide-react';
import { useMarkAllRead, useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';

export function NotificationsList({ locale }: { locale: string }) {
  const t = useTranslations();
  const { data, isLoading } = useNotifications(true);
  const markAll = useMarkAllRead();

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t('common.loading')}</p>;
  }

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  if (items.length === 0) {
    return (
      <div className="border-border bg-muted/30 rounded-2xl border border-dashed p-6 text-center">
        <p className="text-muted-foreground text-sm">{t('notifications.empty')}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {unread > 0 && (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded text-xs font-medium transition focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
          >
            <CheckCheck className="h-3.5 w-3.5" aria-hidden />
            {t('notifications.markAllRead')}
          </button>
        </div>
      )}
      <ul className="border-border bg-card grid gap-0.5 rounded-2xl border p-1 shadow-sm">
        {items.map((n) => (
          <li key={n.id}>
            <NotificationItem notification={n} locale={locale} />
          </li>
        ))}
      </ul>
    </div>
  );
}
