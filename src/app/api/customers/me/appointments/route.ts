import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handle, ok } from '@/lib/api';
import { requireCustomer } from '@/lib/auth/guards';
import { APPOINTMENT_INCLUDE, appointmentToDto } from '@/lib/booking';
import { type AppointmentDto } from '@/schemas/booking';

export const GET = handle(async (req: NextRequest) => {
  const user = await requireCustomer();
  const status = req.nextUrl.searchParams.get('status');
  const allowed = ['HELD', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const;
  const filterStatus = allowed.find((s) => s === status);

  const items = await prisma.appointment.findMany({
    where: {
      customerId: user.customerId,
      ...(filterStatus ? { status: filterStatus } : {}),
    },
    orderBy: { startsAt: 'desc' },
    include: APPOINTMENT_INCLUDE,
    take: 100,
  });

  const dtos: AppointmentDto[] = items.map(appointmentToDto);
  return ok(dtos);
});
