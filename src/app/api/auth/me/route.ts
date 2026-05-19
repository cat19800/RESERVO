import { handle, ok } from '@/lib/api';
import { getSessionUser } from '@/lib/auth/guards';

export const GET = handle(async () => {
  const user = await getSessionUser();
  return ok({ user });
});
