import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth/guards';
import {
  notificationSettingsUpdateSchema,
  type NotificationSettingsResponse,
} from '@/schemas/notification-settings';

function toDto(
  s: Pick<
    Awaited<ReturnType<typeof prisma.notificationSettings.findUnique>> & object,
    'inAppEnabled' | 'emailEnabled' | 'smsEnabled' | 'pushEnabled' | 'reminderHours'
  >,
): NotificationSettingsResponse {
  return {
    inAppEnabled: s.inAppEnabled,
    emailEnabled: s.emailEnabled,
    smsEnabled: s.smsEnabled,
    pushEnabled: s.pushEnabled,
    reminderHours: s.reminderHours,
  };
}

export const GET = handle(async () => {
  const user = await requireUser();
  const settings = await prisma.notificationSettings.findUnique({ where: { userId: user.id } });
  if (!settings) throw new ApiError('NOTIFICATION_SETTINGS_NOT_FOUND', 404);
  return ok(toDto(settings));
});

export const PATCH = handle(async (req: NextRequest) => {
  const user = await requireUser();
  const body = notificationSettingsUpdateSchema.parse(await req.json());

  const updated = await prisma.notificationSettings.update({
    where: { userId: user.id },
    data: body,
  });
  return ok(toDto(updated));
});
