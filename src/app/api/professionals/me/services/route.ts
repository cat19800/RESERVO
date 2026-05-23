import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, ok } from '@/lib/api';
import { requireProfessional } from '@/lib/auth/guards';
import { serviceCreateSchema, type ServiceResponse } from '@/schemas/service';

function toDto(s: {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
}): ServiceResponse {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    durationMinutes: s.durationMinutes,
    priceCents: s.priceCents,
    active: s.active,
  };
}

export const GET = handle(async () => {
  const user = await requireProfessional();
  const services = await prisma.service.findMany({
    where: { professionalId: user.professionalId },
    orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
  });
  return ok(services.map(toDto));
});

export const POST = handle(async (req: NextRequest) => {
  const user = await requireProfessional();
  const body = serviceCreateSchema.parse(await req.json());

  // UC6 alt-flow 2: duplicate-name protection (DB enforces too).
  const existing = await prisma.service.findUnique({
    where: { professionalId_name: { professionalId: user.professionalId, name: body.name } },
    select: { id: true },
  });
  if (existing) throw new ApiError('SERVICE_NAME_TAKEN', 409);

  const created = await prisma.service.create({
    data: {
      professionalId: user.professionalId,
      name: body.name,
      description: body.description,
      durationMinutes: body.durationMinutes,
      priceCents: body.priceCents,
    },
  });
  return ok(toDto(created), { status: 201 });
});
