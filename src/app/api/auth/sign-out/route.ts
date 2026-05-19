import { handle, ok } from '@/lib/api';
import { clearSessionCookie } from '@/lib/auth/session';

export const POST = handle(async () => {
  await clearSessionCookie();
  return ok({ ok: true });
});
