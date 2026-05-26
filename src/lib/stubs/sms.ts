import { type Prisma } from '@generated/client';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';

export type SendReminderInput = {
  appointmentId: string;
  customerUserId: string;
  professionalName: string;
  serviceName: string;
  startsAtIso: string;
};

export type SendResult = {
  status: 'sent' | 'failed' | 'skipped';
  channel: 'sms-stub';
  message: string;
};

/**
 * Fake SMS sender. Honors `SMS_STUB_MODE` to simulate gateway failures so we
 * can demo the retry path. On success, writes a Notification (in-app surface)
 * + a ReminderHistory row in the same transaction. The unique
 * `(appointmentId, channel)` index makes this idempotent: a second call for
 * the same appointment + channel returns `'skipped'` instead of double-writing.
 *
 * Returns 'failed' (without persisting either row) when the stub mode says so.
 * Real production code would queue + retry; here the cron just picks it up
 * again on the next tick if no successful row exists.
 */
export async function sendReminderSms(input: SendReminderInput): Promise<SendResult> {
  const mode = env.SMS_STUB_MODE;
  const failing = mode === 'always-fail' || (mode === 'random' && Math.random() < 0.3);
  if (failing) {
    return { status: 'failed', channel: 'sms-stub', message: 'simulated gateway failure' };
  }

  const existing = await prisma.reminderHistory.findUnique({
    where: {
      appointmentId_channel: {
        appointmentId: input.appointmentId,
        channel: 'sms-stub',
      },
    },
    select: { id: true, status: true },
  });
  if (existing && existing.status === 'sent') {
    return { status: 'skipped', channel: 'sms-stub', message: 'already sent' };
  }

  const messageBody = `RESERVO: ${input.serviceName} με ${input.professionalName} στις ${input.startsAtIso}`;
  const payload: Prisma.InputJsonObject = {
    appointmentId: input.appointmentId,
    professionalName: input.professionalName,
    serviceName: input.serviceName,
    startsAtIso: input.startsAtIso,
    target: `/appointments/${input.appointmentId}`,
  };

  await prisma.$transaction([
    prisma.notification.create({
      data: {
        userId: input.customerUserId,
        type: 'REMINDER',
        titleKey: 'notifications.reminder.title',
        bodyKey: 'notifications.reminder.body',
        payload,
        appointmentId: input.appointmentId,
      },
    }),
    prisma.reminderHistory.upsert({
      where: {
        appointmentId_channel: {
          appointmentId: input.appointmentId,
          channel: 'sms-stub',
        },
      },
      create: {
        appointmentId: input.appointmentId,
        channel: 'sms-stub',
        status: 'sent',
        meta: { messageBody } satisfies Prisma.InputJsonObject,
      },
      update: {
        status: 'sent',
        sentAt: new Date(),
        meta: { messageBody } satisfies Prisma.InputJsonObject,
      },
    }),
  ]);

  return { status: 'sent', channel: 'sms-stub', message: messageBody };
}
