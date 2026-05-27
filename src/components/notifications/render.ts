import { type useFormatter, type useTranslations } from 'next-intl';
import { type NotificationDto } from '@/schemas/notification';

const APP_TZ = 'Europe/Athens';

type Translator = ReturnType<typeof useTranslations>;
type Formatter = ReturnType<typeof useFormatter>;

/**
 * Notification body templates contain `{when}` / `{newWhen}` placeholders
 * but the row stores ISO timestamps so locale switches re-render correctly.
 * This helper formats those timestamps using the current locale's formatter
 * and returns the resolved title + body strings.
 */
export function renderNotification(
  n: NotificationDto,
  t: Translator,
  fmt: Formatter,
): { title: string; body: string } {
  const payload = n.payload as Record<string, unknown>;

  const variables: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (typeof v === 'string' || typeof v === 'number') {
      variables[k] = v;
    }
  }

  const startsAtIso = typeof payload.startsAtIso === 'string' ? payload.startsAtIso : null;
  const newStartsAtIso =
    typeof payload.newStartsAtIso === 'string' ? payload.newStartsAtIso : null;

  const fmtDate = (iso: string) =>
    fmt.dateTime(new Date(iso), {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: APP_TZ,
    });

  if (startsAtIso) variables.when = fmtDate(startsAtIso);
  if (newStartsAtIso) variables.newWhen = fmtDate(newStartsAtIso);

  return {
    title: t(n.titleKey as 'notifications.reviewRequest.title'),
    body: t(n.bodyKey as 'notifications.reviewRequest.body', variables),
  };
}

export function notificationTarget(n: NotificationDto): string | null {
  const payload = n.payload as Record<string, unknown>;
  return typeof payload.target === 'string' ? payload.target : null;
}
