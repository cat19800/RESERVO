import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, ok } from '@/lib/api';
import { requireProfessional } from '@/lib/auth/guards';
import { serviceUpdateSchema, type ServiceResponse } from '@/schemas/service';

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

async function ownedService(serviceId: string, professionalId: string) {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || service.professionalId !== professionalId) {
    throw new ApiError('NOT_FOUND', 404);
  }
  return service;
}

export const PUT = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireProfessional();
    const { id } = await ctx.params;
    const body = serviceUpdateSchema.parse(await req.json());

    await ownedService(id, user.professionalId);

    if (body.name) {
      const dup = await prisma.service.findUnique({
        where: { professionalId_name: { professionalId: user.professionalId, name: body.name } },
        select: { id: true },
      });
      if (dup && dup.id !== id) throw new ApiError('SERVICE_NAME_TAKEN', 409);
    }

    const updated = await prisma.service.update({ where: { id }, data: body });
    return ok(toDto(updated));
  },
);

/**
 * Soft-delete: sets `active = false`. Phase 6 will reject deletion if there are
 * future CONFIRMED/HELD appointments using this service (UC6 alt-flow 1).
 */
export const DELETE = handle(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireProfessional();
    const { id } = await ctx.params;

    await ownedService(id, user.professionalId);

    const updated = await prisma.service.update({
      where: { id },
      data: { active: false },
    });
    return ok(toDto(updated));
  },
);
