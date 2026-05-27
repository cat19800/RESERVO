import { type Prisma } from '@generated/client';
import { prisma } from '@/lib/prisma';
import { handle, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth/guards';
import { type NotificationDto, type NotificationsListDto } from '@/schemas/notification';

const LIMIT = 50;

export const GET = handle(async () => {
  const user = await requireUser();
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: LIMIT,
    }),
    prisma.notification.count({
      where: { userId: user.id, readAt: null },
    }),
  ]);

  const dtos: NotificationDto[] = items.map((n) => ({
    id: n.id,
    type: n.type,
    titleKey: n.titleKey,
    bodyKey: n.bodyKey,
    payload: (n.payload ?? {}) as Prisma.JsonObject,
    appointmentId: n.appointmentId,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  }));

  const response: NotificationsListDto = { items: dtos, unreadCount };
  return ok(response);
});
