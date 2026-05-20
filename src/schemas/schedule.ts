import { z } from 'zod';

const HHmm = /^([01]\d|2[0-3]):[0-5]\d$/;

export const workingHoursEntrySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(HHmm, 'pro.schedule.errors.invalidTime'),
    endTime: z.string().regex(HHmm, 'pro.schedule.errors.invalidTime'),
  })
  .refine((v) => v.startTime < v.endTime, {
    message: 'pro.schedule.errors.endBeforeStart',
    path: ['endTime'],
  });

export const scheduleUpdateSchema = z.object({
  slotGranularityMinutes: z.number().int().min(5).max(120).optional(),
  bufferMinutes: z.number().int().min(0).max(60).optional(),
  workingHours: z.array(workingHoursEntrySchema).max(14),
});

export type ScheduleUpdateInput = z.infer<typeof scheduleUpdateSchema>;

export type ScheduleResponse = {
  slotGranularityMinutes: number;
  bufferMinutes: number;
  workingHours: { id: string; dayOfWeek: number; startTime: string; endTime: string }[];
};
