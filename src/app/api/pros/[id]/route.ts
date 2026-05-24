import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, ok } from '@/lib/api';
import { isActivePremium } from '@/lib/premium';
import { type ProProfileDto } from '@/schemas/search';

export const GET = handle(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;

    const pro = await prisma.professional.findUnique({
      where: { id },
      include: {
        user: { select: { profile: { select: { avatarSeed: true } } } },
        subscription: { select: { status: true, expiresAt: true } },
        services: {
          where: { active: true },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            durationMinutes: true,
            priceCents: true,
          },
        },
        schedule: {
          select: {
            workingHours: {
              select: { dayOfWeek: true, startTime: true, endTime: true },
              orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
            },
          },
        },
      },
    });
    if (!pro) throw new ApiError('NOT_FOUND', 404);

    const dto: ProProfileDto = {
      id: pro.id,
      displayName: pro.displayName,
      category: pro.category,
      specialty: pro.specialty,
      city: pro.city,
      address: pro.address,
      ratingAvg: pro.ratingAvg,
      ratingCount: pro.ratingCount,
      description: pro.description,
      avatarSeed: pro.user.profile?.avatarSeed ?? pro.id,
      isPremium: isActivePremium(pro.subscription),
      services: pro.services,
      workingHours: pro.schedule?.workingHours ?? [],
    };
    return ok(dto);
  },
);
