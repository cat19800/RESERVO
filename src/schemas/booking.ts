import { z } from 'zod';

export const HOLD_DURATION_MINUTES = 10;

export const APPOINTMENT_STATUSES = ['HELD', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const;
export type AppointmentStatusValue = (typeof APPOINTMENT_STATUSES)[number];

export const availabilityQuerySchema = z.object({
  serviceId: z.uuid(),
  fromDate: z.iso.datetime(),
  toDate: z.iso.datetime(),
});
export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;

export type AvailabilityResponse = {
  slots: { startsAt: string; endsAt: string }[];
};

export const createAppointmentSchema = z.object({
  professionalId: z.uuid(),
  serviceId: z.uuid(),
  startsAt: z.iso.datetime(),
});
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export type AppointmentDto = {
  id: string;
  status: AppointmentStatusValue;
  startsAt: string;
  endsAt: string;
  tentativeUntil: string | null;
  cancelledAt: string | null;
  cancelledBy: 'CUSTOMER' | 'PROFESSIONAL' | 'SYSTEM' | null;
  cancellationReason: string | null;
  professional: {
    id: string;
    displayName: string;
    category: 'DOCTOR' | 'GYM' | 'HAIR_SALON' | 'BEAUTY_CARE';
    city: string;
    avatarSeed: string;
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    avatarSeed: string;
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    priceCents: number;
  };
};

export const cancelAppointmentSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
