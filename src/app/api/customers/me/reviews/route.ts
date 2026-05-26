import { prisma } from '@/lib/prisma';
import { handle, ok } from '@/lib/api';
import { requireCustomer } from '@/lib/auth/guards';

export type CustomerReviewDto = {
  id: string;
  appointmentId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  professional: {
    id: string;
    displayName: string;
    avatarSeed: string;
  };
  service: {
    name: string;
  };
};

export const GET = handle(async () => {
  const user = await requireCustomer();
  const items = await prisma.review.findMany({
    where: { customerId: user.customerId },
    include: {
      professional: { include: { user: { include: { profile: true } } } },
      appointment: { include: { service: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const dtos: CustomerReviewDto[] = items.map((r) => ({
    id: r.id,
    appointmentId: r.appointmentId,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    professional: {
      id: r.professional.id,
      displayName: r.professional.displayName,
      avatarSeed: r.professional.user.profile?.avatarSeed ?? r.professional.id,
    },
    service: { name: r.appointment.service.name },
  }));
  return ok(dtos);
});
