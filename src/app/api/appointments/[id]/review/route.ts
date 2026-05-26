import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, ok } from '@/lib/api';
import { requireCustomer } from '@/lib/auth/guards';
import { reviewWriteSchema, type ReviewDto } from '@/schemas/review';
import { containsProfanity } from '@/lib/moderation';
import { recomputeProfessionalRating } from '@/lib/reviews';

type ReviewWithRelations = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: string;
    user: { profile: { firstName: string; lastName: string; avatarSeed: string } | null };
  };
  appointment: { service: { name: string } };
};

function toDto(r: ReviewWithRelations): ReviewDto {
  return {
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
  };
}

const REVIEW_INCLUDE = {
  customer: { include: { user: { include: { profile: true } } } },
  appointment: { include: { service: true } },
} as const;

/**
 * POST: create a review for a COMPLETED appointment owned by the current customer.
 * UC4 alt-flow E1: appointment must be COMPLETED.
 * UC4 alt-flow E2: if a review already exists, surface ALREADY_REVIEWED so the
 *   client can switch to the PUT (edit) flow.
 * UC4 alt-flow E3: comment goes through `containsProfanity` → 422.
 *
 * Wraps the review insert + rating recompute in one transaction.
 */
export const POST = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireCustomer();
    const { id: appointmentId } = await ctx.params;
    const body = reviewWriteSchema.parse(await req.json());

    if (body.comment && containsProfanity(body.comment)) {
      throw new ApiError('INAPPROPRIATE_CONTENT', 422);
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { review: true },
    });
    if (!appointment) throw new ApiError('NOT_FOUND', 404);
    if (appointment.customerId !== user.customerId) throw new ApiError('NOT_FOUND', 404);
    if (appointment.status !== 'COMPLETED') throw new ApiError('NOT_ELIGIBLE', 409);
    if (appointment.review) throw new ApiError('ALREADY_REVIEWED', 409);

    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          appointmentId,
          customerId: appointment.customerId,
          professionalId: appointment.professionalId,
          rating: body.rating,
          comment: body.comment,
        },
        include: REVIEW_INCLUDE,
      });
      await recomputeProfessionalRating(tx, appointment.professionalId);
      return created;
    });

    return ok(toDto(review), { status: 201 });
  },
);

/** PUT: edit an existing review (UC4 alt-flow E2). */
export const PUT = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireCustomer();
    const { id: appointmentId } = await ctx.params;
    const body = reviewWriteSchema.parse(await req.json());

    if (body.comment && containsProfanity(body.comment)) {
      throw new ApiError('INAPPROPRIATE_CONTENT', 422);
    }

    const existing = await prisma.review.findUnique({
      where: { appointmentId },
    });
    if (!existing) throw new ApiError('NOT_FOUND', 404);
    if (existing.customerId !== user.customerId) throw new ApiError('NOT_FOUND', 404);

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.review.update({
        where: { appointmentId },
        data: { rating: body.rating, comment: body.comment ?? null },
        include: REVIEW_INCLUDE,
      });
      await recomputeProfessionalRating(tx, existing.professionalId);
      return r;
    });

    return ok(toDto(updated));
  },
);

/** GET the customer's review for this appointment, if any. */
export const GET = handle(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireCustomer();
    const { id: appointmentId } = await ctx.params;
    const review = await prisma.review.findUnique({
      where: { appointmentId },
      include: REVIEW_INCLUDE,
    });
    if (!review) throw new ApiError('NOT_FOUND', 404);
    if (review.customerId !== user.customerId) throw new ApiError('NOT_FOUND', 404);
    return ok(toDto(review));
  },
);
