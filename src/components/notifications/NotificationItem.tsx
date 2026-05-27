'use client';

import { useRouter } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { type NotificationDto } from '@/schemas/notification';
import { useMarkNotificationRead } from '@/hooks/useNotifications';
import { notificationTarget, renderNotification } from './render';

export function NotificationItem({
  notification,
  locale,
  onAfterClick,
}: {
  notification: NotificationDto;
  locale: string;
  /** Optional callback fired after the click is handled (e.g. close popover). */
  onAfterClick?: () => void;
}) {
  const t = useTranslations();
  const fmt = useFormatter();
  const router = useRouter();
  const markRead = useMarkNotificationRead();

  const { title, body } = renderNotification(notification, t, fmt);
  const isUnread = notification.readAt === null;
  const target = notificationTarget(notification);

  function handleClick() {
    if (isUnread) markRead.mutate(notification.id);
    if (target) router.push(`/${locale}${target}`);
    onAfterClick?.();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'hover:bg-muted/60 focus-visible:bg-muted/60 grid w-full gap-1 rounded-lg px-3 py-2 text-left text-sm transition focus-visible:outline-none',
        isUnread && 'bg-primary/5',
      )}
    >
      <div className="flex items-start gap-2">
        {isUnread && (
          <span
            className="bg-primary mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
            aria-hidden
          />
        )}
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-sm', isUnread ? 'font-semibold' : 'font-medium')}>
            {title}
          </p>
          <p className="text-muted-foreground line-clamp-2 text-xs">{body}</p>
          <p className="text-muted-foreground mt-0.5 text-[10px]">
            {fmt.dateTime(new Date(notification.createdAt), {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })}
          </p>
        </div>
      </div>
    </button>
  );
}
