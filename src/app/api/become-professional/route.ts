import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth/guards';
import {
  becomeProfessionalServerSchema,
  nullIfEmpty,
  type BecomeProfessionalResponse,
} from '@/schemas/become-professional';

export const POST = handle(async (req: NextRequest) => {
  const user = await requireUser();
  const body = becomeProfessionalServerSchema.parse(await req.json());

  // Reject if the user already has a professional account.
  const existing = await prisma.professional.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (existing) throw new ApiError('ALREADY_A_PROFESSIONAL', 409);

  const companyName = nullIfEmpty(body.companyName);
  const specialty = nullIfEmpty(body.specialty);
  const description = nullIfEmpty(body.description);
  const serviceDescription = nullIfEmpty(body.serviceDescription);

  // Create everything in one transaction. If any step fails, none persist.
  // §6 of PLAN.md: "lock-short-transactions" — no external IO inside this tx.
  const professionalId = await prisma.$transaction(async (tx) => {
    let companyId: string | undefined;
    if (companyName) {
      const existingCo = await tx.company.findUnique({
        where: { name: companyName },
        select: { id: true },
      });
      if (existingCo) throw new ApiError('COMPANY_NAME_TAKEN', 409);
      const company = await tx.company.create({
        data: {
          name: companyName,
          category: body.category,
          city: body.city,
          address: body.address,
        },
      });
      companyId = company.id;
    }

    const pro = await tx.professional.create({
      data: {
        userId: user.id,
        displayName: body.displayName,
        category: body.category,
        specialty,
        description,
        city: body.city,
        address: body.address,
        companyId,
        cancellationRules: { create: {} },
        services: {
          create: {
            name: body.serviceName,
            description: serviceDescription,
            durationMinutes: body.serviceDurationMinutes,
            priceCents: body.servicePriceCents,
          },
        },
        schedule: {
          create: {
            workingHours: {
              create: body.workingDays.map((day) => ({
                dayOfWeek: day,
                startTime: body.startTime,
                endTime: body.endTime,
              })),
            },
          },
        },
      },
      select: { id: true },
    });

    // Premium upgrade is wired up in Phase 11; ignore the `plan` value for now
    // beyond echoing it back in the response.

    return pro.id;
  });

  const dto: BecomeProfessionalResponse = { professionalId };
  return ok(dto, { status: 201 });
});
