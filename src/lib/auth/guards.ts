import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { readSessionFromCookies } from '@/lib/auth/session';
import { ApiError } from '@/lib/api';

export type SessionUser = {
  id: string;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
    avatarSeed: string;
  } | null;
  customerId: string | null;
  professionalId: string | null;
};

async function loadUser(userId: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: { select: { firstName: true, lastName: true, avatarSeed: true } },
      customer: { select: { id: true } },
      professional: { select: { id: true } },
    },
  });
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    profile: user.profile,
    customerId: user.customer?.id ?? null,
    professionalId: user.professional?.id ?? null,
  };
}

/** Returns the current session user, or null. Use in pages that conditionally render. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await readSessionFromCookies();
  if (!session) return null;
  return loadUser(session.userId);
}

/**
 * Throws 401 if not signed in. Use in API routes.
 * For pages, prefer `requireUserOrRedirect` which redirects instead of throwing.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError('UNAUTHORIZED', 401);
  return user;
}

/** Use in (customer)/(pro) layouts to redirect unauthenticated users to sign-in. */
export async function requireUserOrRedirect(locale: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/sign-in`);
  return user;
}

/** Use in (pro) pages — assumes the layout already guaranteed a Professional row exists. */
export async function requireProfessionalOrRedirect(
  locale: string,
): Promise<SessionUser & { professionalId: string }> {
  const user = await requireUserOrRedirect(locale);
  if (!user.professionalId) redirect(`/${locale}/become-professional`);
  return user as SessionUser & { professionalId: string };
}

export async function requireCustomer(): Promise<SessionUser & { customerId: string }> {
  const user = await requireUser();
  if (!user.customerId) throw new ApiError('NOT_A_CUSTOMER', 403);
  return user as SessionUser & { customerId: string };
}

export async function requireProfessional(): Promise<SessionUser & { professionalId: string }> {
  const user = await requireUser();
  if (!user.professionalId) throw new ApiError('NOT_A_PROFESSIONAL', 403);
  return user as SessionUser & { professionalId: string };
}
