import { type Prisma } from '@generated/client';

type Tx = Prisma.TransactionClient;

/**
 * Recompute a professional's cached `ratingAvg` and `ratingCount` from the
 * Review table. Called inside the same transaction as the review write so
 * the cached fields are always consistent with the underlying rows.
 */
export async function recomputeProfessionalRating(
  tx: Tx,
  professionalId: string,
): Promise<void> {
  const agg = await tx.review.aggregate({
    where: { professionalId },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await tx.professional.update({
    where: { id: professionalId },
    data: {
      ratingAvg: agg._avg.rating ?? 0,
      ratingCount: agg._count._all,
    },
  });
}
