import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handle, ok } from '@/lib/api';
import { isActivePremium } from '@/lib/premium';
import {
  searchQuerySchema,
  type ProCardDto,
  type ProSearchResponse,
} from '@/schemas/search';

const DEFAULT_PAGE_SIZE = 12;

export const GET = handle(async (req: NextRequest) => {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const q = searchQuerySchema.parse(params);

  // Build the WHERE incrementally so we can pass it to both findMany and count.
  const filters: Record<string, unknown> = {};
  if (q.category) filters.category = q.category;
  if (q.city) filters.city = { contains: q.city, mode: 'insensitive' };
  if (q.q) {
    filters.OR = [
      { displayName: { contains: q.q, mode: 'insensitive' } },
      { specialty: { contains: q.q, mode: 'insensitive' } },
      { description: { contains: q.q, mode: 'insensitive' } },
    ];
  }
  if (q.minRating !== undefined) filters.ratingAvg = { gte: q.minRating };

  const page = q.page ?? 0;
  const pageSize = Math.min(q.pageSize ?? DEFAULT_PAGE_SIZE, 50);

  // Premium-active rows always float to the top, then the user's chosen sort
  // applies. We can't express "isActivePremium" in pure SQL (it's a status +
  // expiry check), so we use `subscription: { is: { status: 'ACTIVE' } }` as a
  // close enough proxy for ordering — cancelled-but-still-paid pros (rare,
  // small window) drop out of the boost early but everything else is correct.
  // Final isActivePremium check happens per row after we read.
  const baseSort =
    q.sort === 'recent'
      ? [{ createdAt: 'desc' as const }]
      : [{ ratingAvg: 'desc' as const }, { ratingCount: 'desc' as const }];
  const orderBy = [
    { subscription: { status: 'asc' as const } }, // ACTIVE < CANCELLED < EXPIRED alphabetically — works because ACTIVE sorts first
    ...baseSort,
  ];

  const [items, total] = await Promise.all([
    prisma.professional.findMany({
      where: filters,
      orderBy,
      skip: page * pageSize,
      take: pageSize,
      select: {
        id: true,
        displayName: true,
        category: true,
        specialty: true,
        city: true,
        ratingAvg: true,
        ratingCount: true,
        user: { select: { profile: { select: { avatarSeed: true } } } },
        subscription: { select: { status: true, expiresAt: true } },
      },
    }),
    prisma.professional.count({ where: filters }),
  ]);

  const dto: ProSearchResponse = {
    items: items.map<ProCardDto>((p) => ({
      id: p.id,
      displayName: p.displayName,
      category: p.category,
      specialty: p.specialty,
      city: p.city,
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
      avatarSeed: p.user.profile?.avatarSeed ?? p.id,
      isPremium: isActivePremium(p.subscription),
    })),
    page,
    pageSize,
    total,
  };

  return ok(dto);
});
