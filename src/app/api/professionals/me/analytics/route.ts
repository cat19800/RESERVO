import { prisma } from '@/lib/prisma';
import { handle, ok } from '@/lib/api';
import { requireProfessional } from '@/lib/auth/guards';
import { requirePremium } from '@/lib/premium';
import { type AnalyticsResponseDto } from '@/schemas/analytics';

const MONTHS_BACK = 12;
const TOP_SERVICES_LIMIT = 5;

/**
 * Premium-gated analytics for the calling professional. We could split this
 * into 4 endpoints — but the dashboard always renders all four together, and
 * one query round-trip beats four. The shape mirrors the chart components.
 *
 * Revenue/cancellation only count COMPLETED appointments — pending HELD or
 * future CONFIRMED rows aren't "earned" yet. CONFIRMED counts toward the
 * "bookings/month" line because that's "what the calendar looks like".
 */
export const GET = handle(async () => {
  const user = await requireProfessional();
  await requirePremium(user.professionalId);

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS_BACK - 1), 1));
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Single fetch + in-memory aggregate — Prisma's groupBy on JSON fields was
  // overkill, and we already need per-row data for top services anyway.
  const appts = await prisma.appointment.findMany({
    where: {
      professionalId: user.professionalId,
      OR: [
        { status: 'CONFIRMED' },
        { status: 'COMPLETED' },
        { status: 'CANCELLED' },
      ],
      startsAt: { gte: monthStart },
    },
    select: {
      status: true,
      startsAt: true,
      serviceId: true,
      service: { select: { name: true, priceCents: true } },
    },
  });

  // Lifetime revenue is from COMPLETED only and not bounded by `monthStart`.
  // priceCents lives on Service, not Appointment, so we join then reduce.
  const lifetimeCompleted = await prisma.appointment.findMany({
    where: { professionalId: user.professionalId, status: 'COMPLETED' },
    select: { service: { select: { priceCents: true } } },
  });
  const lifetimeRevenue = lifetimeCompleted.reduce(
    (sum, a) => sum + a.service.priceCents,
    0,
  );

  let last30Revenue = 0;
  const totals = { confirmed: 0, completed: 0, cancelled: 0 };
  const monthBuckets = new Map<string, number>();
  const serviceBuckets = new Map<
    string,
    { name: string; count: number; revenueCents: number }
  >();

  for (let i = 0; i < MONTHS_BACK; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    monthBuckets.set(key, 0);
  }

  for (const a of appts) {
    if (a.status === 'CONFIRMED') totals.confirmed += 1;
    else if (a.status === 'COMPLETED') totals.completed += 1;
    else if (a.status === 'CANCELLED') totals.cancelled += 1;

    if (a.status === 'COMPLETED' && a.startsAt >= last30) {
      last30Revenue += a.service.priceCents;
    }

    if (a.status !== 'CANCELLED') {
      const monthKey = `${a.startsAt.getUTCFullYear()}-${String(
        a.startsAt.getUTCMonth() + 1,
      ).padStart(2, '0')}`;
      monthBuckets.set(monthKey, (monthBuckets.get(monthKey) ?? 0) + 1);
    }

    if (a.status === 'COMPLETED') {
      const bucket = serviceBuckets.get(a.serviceId) ?? {
        name: a.service.name,
        count: 0,
        revenueCents: 0,
      };
      bucket.count += 1;
      bucket.revenueCents += a.service.priceCents;
      serviceBuckets.set(a.serviceId, bucket);
    }
  }

  const totalForRate = totals.confirmed + totals.completed + totals.cancelled;
  const dto: AnalyticsResponseDto = {
    revenueCents: {
      last30Days: last30Revenue,
      lifetime: lifetimeRevenue,
    },
    cancellationRate: {
      cancelled: totals.cancelled,
      total: totalForRate,
      rate: totalForRate === 0 ? 0 : totals.cancelled / totalForRate,
    },
    bookingsByMonth: Array.from(monthBuckets.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    topServices: Array.from(serviceBuckets.entries())
      .map(([serviceId, b]) => ({
        serviceId,
        serviceName: b.name,
        count: b.count,
        revenueCents: b.revenueCents,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_SERVICES_LIMIT),
    totals,
  };

  return ok(dto);
});
