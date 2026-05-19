import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, ok } from '@/lib/api';
import { verifyPassword } from '@/lib/auth/password';
import { signSession, setSessionCookie } from '@/lib/auth/session';
import { signInSchema } from '@/schemas/auth';

export const POST = handle(async (req: NextRequest) => {
  const body = signInSchema.parse(await req.json());

  const user = await prisma.user.findUnique({
    where: { email: body.email },
    select: { id: true, email: true, password: true },
  });
  if (!user) throw new ApiError('INVALID_CREDENTIALS', 401);

  const passwordOk = await verifyPassword(body.password, user.password);
  if (!passwordOk) throw new ApiError('INVALID_CREDENTIALS', 401);

  const token = await signSession({ userId: user.id });
  await setSessionCookie(token);

  return ok({ user: { id: user.id, email: user.email } });
});
