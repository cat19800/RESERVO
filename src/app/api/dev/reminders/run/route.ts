import { type NextRequest } from 'next/server';
import { ApiError, handle, ok } from '@/lib/api';
import { env } from '@/lib/env';
import { runReminderTick } from '@/lib/reminders';

/**
 * Dev-only: trigger one reminder tick on demand. `?force=1` widens the
 * lookahead window to 7 days and ignores `smsEnabled` so demos can fire
 * reminders without waiting for real time. Same gate as the
 * `complete-past-appointments` endpoint (DEV_TOOLS=1).
 */
export const POST = handle(async (req: NextRequest) => {
  if (!env.DEV_TOOLS) throw new ApiError('FORBIDDEN', 403);
  const url = new URL(req.url);
  const force = url.searchParams.get('force') === '1';
  const result = await runReminderTick({ force });
  return ok(result);
});
