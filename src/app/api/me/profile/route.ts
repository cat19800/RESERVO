import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth/guards';
import { profileUpdateSchema, type ProfileResponse } from '@/schemas/profile';

export const GET = handle(async () => {
  const user = await requireUser();
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!profile) throw new ApiError('PROFILE_NOT_FOUND', 404);

  const dto: ProfileResponse = {
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    city: profile.city,
    address: profile.address,
    bio: profile.bio,
    avatarSeed: profile.avatarSeed,
  };
  return ok(dto);
});

export const PATCH = handle(async (req: NextRequest) => {
  const user = await requireUser();
  const body = profileUpdateSchema.parse(await req.json());

  const updated = await prisma.profile.update({
    where: { userId: user.id },
    data: body,
  });

  const dto: ProfileResponse = {
    firstName: updated.firstName,
    lastName: updated.lastName,
    phone: updated.phone,
    city: updated.city,
    address: updated.address,
    bio: updated.bio,
    avatarSeed: updated.avatarSeed,
  };
  return ok(dto);
});
