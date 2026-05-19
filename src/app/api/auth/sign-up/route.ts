import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, ok } from '@/lib/api';
import { hashPassword } from '@/lib/auth/password';
import { signSession, setSessionCookie } from '@/lib/auth/session';
import { signUpSchema } from '@/schemas/auth';

export const POST = handle(async (req: NextRequest) => {
  const body = signUpSchema.parse(await req.json());

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) throw new ApiError('EMAIL_TAKEN', 409);

  const password = await hashPassword(body.password);

  const user = await prisma.user.create({
    data: {
      email: body.email,
      password,
      profile: {
        create: {
          firstName: body.firstName,
          lastName: body.lastName,
          avatarSeed: body.email,
        },
      },
      notificationSettings: { create: {} },
      customer: { create: {} },
    },
    select: { id: true, email: true },
  });

  const token = await signSession({ userId: user.id });
  await setSessionCookie(token);

  return ok({ user }, { status: 201 });
});
