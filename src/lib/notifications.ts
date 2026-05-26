import { type NotificationType, type Prisma } from '@generated/client';
import { prisma } from '@/lib/prisma';

type Tx = Prisma.TransactionClient | typeof prisma;

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  /** i18n key for the notification's title (e.g. `notifications.reviewRequest.title`). */
  titleKey: string;
  /** i18n key for the body. */
  bodyKey: string;
  /** Variables for the i18n template. */
  payload?: Prisma.InputJsonObject;
  appointmentId?: string;
};

/**
 * Create a single Notification row. Phase 9 builds the bell + listing UI on
 * top; this helper just persists the data so booking/cancel/review/cron flows
 * can emit notifications today.
 *
 * Accepts an optional Prisma transaction client so callers can include the
 * notification in the same tx as the action that triggered it.
 */
export async function createNotification(
  client: Tx,
  input: CreateNotificationInput,
): Promise<void> {
  await client.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      titleKey: input.titleKey,
      bodyKey: input.bodyKey,
      payload: input.payload ?? {},
      appointmentId: input.appointmentId,
    },
  });
}
