import { addDays, format, getDay, parse } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export const APP_TZ = 'Europe/Athens';

export type Slot = { startsAt: Date; endsAt: Date };

export type GenerateSlotsInput = {
  workingHours: { dayOfWeek: number; startTime: string; endTime: string }[];
  blockedPeriods: { startsAt: Date; endsAt: Date }[];
  /** How tightly slot start times are spaced inside a working block, in minutes. */
  slotGranularityMinutes: number;
  /** Required gap between the slot end and the next slot start, in minutes. */
  bufferMinutes: number;
  /** Length of the service being booked, in minutes. */
  serviceDurationMinutes: number;
  /** Inclusive UTC instant for the start of the search range. */
  fromDate: Date;
  /** Exclusive UTC instant for the end of the search range. */
  toDate: Date;
  /** Pro's timezone. Defaults to Europe/Athens. */
  tz?: string;
};

/**
 * Generates available slots for a service over a date range.
 *
 * Slots are anchored to the pro's local timezone so DST transitions don't shift
 * the visible offering. We iterate calendar days in `tz` (not UTC days), then
 * for each working-hours block on that day-of-week we walk the granularity grid
 * and collect any slot that fully fits inside the block and doesn't overlap
 * any blocked period.
 *
 * Phase 4 doesn't account for existing appointments — those are filtered out in
 * Phase 6's booking endpoint.
 */
export function generateSlots(input: GenerateSlotsInput): Slot[] {
  const tz = input.tz ?? APP_TZ;
  const slots: Slot[] = [];

  const startStr = formatInTimeZone(input.fromDate, tz, 'yyyy-MM-dd');
  const endStr = formatInTimeZone(input.toDate, tz, 'yyyy-MM-dd');

  const startDate = parse(startStr, 'yyyy-MM-dd', new Date());
  const endDate = parse(endStr, 'yyyy-MM-dd', new Date());

  for (let cur = startDate; cur < endDate; cur = addDays(cur, 1)) {
    const dateStr = format(cur, 'yyyy-MM-dd');
    const dow = getDay(cur); // 0=Sun … 6=Sat
    const blocksForDay = input.workingHours.filter((w) => w.dayOfWeek === dow);

    for (const wh of blocksForDay) {
      const blockStart = fromZonedTime(`${dateStr}T${wh.startTime}:00`, tz);
      const blockEnd = fromZonedTime(`${dateStr}T${wh.endTime}:00`, tz);

      const stepMs = input.slotGranularityMinutes * 60_000;
      const durMs = input.serviceDurationMinutes * 60_000;
      const bufMs = input.bufferMinutes * 60_000;

      let cursorMs = blockStart.getTime();
      const blockEndMs = blockEnd.getTime();

      while (cursorMs + durMs + bufMs <= blockEndMs) {
        const slotStart = new Date(cursorMs);
        const slotEnd = new Date(cursorMs + durMs);

        const overlapsBlocked = input.blockedPeriods.some(
          (bp) => slotStart < bp.endsAt && slotEnd > bp.startsAt,
        );

        if (!overlapsBlocked) {
          slots.push({ startsAt: slotStart, endsAt: slotEnd });
        }

        cursorMs += stepMs;
      }
    }
  }

  return slots;
}
