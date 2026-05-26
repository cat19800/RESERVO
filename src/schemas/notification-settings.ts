import { z } from 'zod';

export const notificationSettingsUpdateSchema = z.object({
  inAppEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  reminderHours: z.number().int().min(1).max(72).optional(),
});

export type NotificationSettingsUpdateInput = z.infer<typeof notificationSettingsUpdateSchema>;

export const notificationSettingsResponseSchema = z.object({
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  reminderHours: z.number().int(),
});

export type NotificationSettingsResponse = z.infer<typeof notificationSettingsResponseSchema>;
