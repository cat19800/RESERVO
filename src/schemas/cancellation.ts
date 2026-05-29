import { z } from 'zod';

export const cancelAppointmentSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;

export const rescheduleAppointmentSchema = z.object({
  startsAt: z.iso.datetime(),
});
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;

export const cancellationRulesUpdateSchema = z.object({
  deadlineHours: z.number().int().min(0).max(168),
});
export type CancellationRulesUpdateInput = z.infer<typeof cancellationRulesUpdateSchema>;

export type CancellationRulesResponse = {
  deadlineHours: number;
};
