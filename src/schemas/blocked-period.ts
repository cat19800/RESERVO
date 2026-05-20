import { z } from 'zod';

export const blockedPeriodCreateSchema = z
  .object({
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    reason: z.string().trim().max(200).optional(),
  })
  .refine((v) => new Date(v.startsAt) < new Date(v.endsAt), {
    message: 'pro.schedule.errors.endBeforeStart',
    path: ['endsAt'],
  });

export type BlockedPeriodCreateInput = z.infer<typeof blockedPeriodCreateSchema>;

export type BlockedPeriodResponse = {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
};
