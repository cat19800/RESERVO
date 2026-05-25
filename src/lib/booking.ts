import { type AppointmentStatus, type CancelledBy, type Prisma } from '@generated/client';
import { type AppointmentDto } from '@/schemas/booking';

type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: {
    professional: {
      include: { user: { include: { profile: true } } };
    };
    customer: {
      include: { user: { include: { profile: true } } };
    };
    service: true;
  };
}>;

export const APPOINTMENT_INCLUDE = {
  professional: { include: { user: { include: { profile: true } } } },
  customer: { include: { user: { include: { profile: true } } } },
  service: true,
} as const;

export function appointmentToDto(a: AppointmentWithRelations): AppointmentDto {
  return {
    id: a.id,
    status: a.status as AppointmentStatus,
    startsAt: a.startsAt.toISOString(),
    endsAt: a.endsAt.toISOString(),
    tentativeUntil: a.tentativeUntil?.toISOString() ?? null,
    cancelledAt: a.cancelledAt?.toISOString() ?? null,
    cancelledBy: (a.cancelledBy as CancelledBy | null) ?? null,
    cancellationReason: a.cancellationReason,
    professional: {
      id: a.professional.id,
      displayName: a.professional.displayName,
      category: a.professional.category,
      city: a.professional.city,
      avatarSeed: a.professional.user.profile?.avatarSeed ?? a.professional.id,
    },
    customer: {
      id: a.customer.id,
      firstName: a.customer.user.profile?.firstName ?? '',
      lastName: a.customer.user.profile?.lastName ?? '',
      avatarSeed: a.customer.user.profile?.avatarSeed ?? a.customer.id,
    },
    service: {
      id: a.service.id,
      name: a.service.name,
      durationMinutes: a.service.durationMinutes,
      priceCents: a.service.priceCents,
    },
  };
}

/**
 * Postgres unique-violation error code from prisma.
 * Used to detect slot conflicts on the partial unique index.
 */
export function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    (e as { code?: unknown }).code === 'P2002'
  );
}
