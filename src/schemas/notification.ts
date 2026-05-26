import { type NotificationType } from '@generated/client';

export type NotificationDto = {
  id: string;
  type: NotificationType;
  titleKey: string;
  bodyKey: string;
  payload: Record<string, unknown>;
  appointmentId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsListDto = {
  items: NotificationDto[];
  unreadCount: number;
};
