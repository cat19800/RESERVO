import 'dotenv/config';
import cron from 'node-cron';
import { env } from '@/lib/env';
import { runReminderTick } from '@/lib/reminders';

/**
 * Optional companion process to `pnpm dev`. Runs the reminder tick on the
 * `REMINDER_CRON_EXPR` schedule (default `*​/1 * * * *` — every minute).
 *
 * The Next.js dev server itself does not start cron jobs because they would
 * be duplicated on every HMR cycle. Run this in a second terminal when you
 * want auto-reminders during the demo:
 *
 *     pnpm cron:dev
 *
 * For manual testing, the `/dev/reminders` page is the primary surface.
 */
async function tick() {
  const startedAt = new Date();
  try {
    const result = await runReminderTick();
    const ms = Date.now() - startedAt.getTime();
    if (result.scanned > 0 || result.completedPast.completed > 0) {
      console.log(
        `[cron] ${startedAt.toISOString()} +${ms}ms ` +
          `scanned=${result.scanned} sent=${result.sent} skipped=${result.skipped} ` +
          `failed=${result.failed} completedPast=${result.completedPast.completed}`,
      );
    }
  } catch (err) {
    console.error('[cron] tick failed:', err);
  }
}

const expr = env.REMINDER_CRON_EXPR;
if (!cron.validate(expr)) {
  console.error(`[cron] invalid REMINDER_CRON_EXPR: ${expr}`);
  process.exit(1);
}

console.log(`[cron] starting with schedule "${expr}" (TZ ${env.APP_TZ})`);
cron.schedule(expr, tick, { timezone: env.APP_TZ });

// Run once on boot so a freshly-started cron picks up backlog immediately.
void tick();
