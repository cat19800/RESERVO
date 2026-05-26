import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, ok } from '@/lib/api';
import { requireProfessional } from '@/lib/auth/guards';
import {
  cancellationRulesUpdateSchema,
  type CancellationRulesResponse,
} from '@/schemas/cancellation';

export const GET = handle(async () => {
  const user = await requireProfessional();
  const rules = await prisma.cancellationRules.findUnique({
    where: { professionalId: user.professionalId },
  });
  if (!rules) throw new ApiError('NOT_FOUND', 404);

  const dto: CancellationRulesResponse = { deadlineHours: rules.deadlineHours };
  return ok(dto);
});

export const PUT = handle(async (req: NextRequest) => {
  const user = await requireProfessional();
  const body = cancellationRulesUpdateSchema.parse(await req.json());

  const updated = await prisma.cancellationRules.upsert({
    where: { professionalId: user.professionalId },
    update: { deadlineHours: body.deadlineHours },
    create: { professionalId: user.professionalId, deadlineHours: body.deadlineHours },
  });

  const dto: CancellationRulesResponse = { deadlineHours: updated.deadlineHours };
  return ok(dto);
});
