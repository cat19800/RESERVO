import { ApiError, handle, ok } from '@/lib/api';
import { env } from '@/lib/env';
import { completePastAppointments } from '@/lib/appointment-completion';

/**
 * Dev-only: scan for CONFIRMED appointments whose `endsAt < now` and flip them
 * to COMPLETED, emitting a REVIEW_REQUEST notification per appointment.
 *
 * Phase 10 wires this same function into a node-cron schedule; this endpoint
 * exists so demos and tests can trigger UC4 without waiting for real time.
 */
export const POST = handle(async () => {
  if (!env.DEV_TOOLS) throw new ApiError('FORBIDDEN', 403);
  const result = await completePastAppointments();
  return ok(result);
});
