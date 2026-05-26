import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handle, ok } from '@/lib/api';
import { type ReviewDto } from '@/schemas/review';

const PAGE_SIZE = 20;

export const GET = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const { id: professionalId } = await ctx.params;
    const page = Math.max(0, Number(req.nextUrl.searchParams.get('page') ?? 0));

    const items = await prisma.review.findMany({
      where: { professionalId },
      include: {
        customer: { include: { user: { include: { profile: true } } } },
        appointment: { include: { service: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    });

    const dtos: ReviewDto[] = items.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      customer: {
        id: r.customer.id,
        firstName: r.customer.user.profile?.firstName ?? '',
        lastName: r.customer.user.profile?.lastName ?? '',
        avatarSeed: r.customer.user.profile?.avatarSeed ?? r.customer.id,
      },
      service: { name: r.appointment.service.name },
    }));
    return ok(dtos);
  },
);
