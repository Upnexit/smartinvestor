/**
 * Asia/Dhaka (UTC+6, no DST) time helpers.
 *
 * সব date/time calculation যাতে server-এর local timezone-এ না হয়ে
 * Bangladesh time-এ হয় — সেই জন্যে সব জায়গায় এই helpers ব্যবহার হবে।
 */

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

/** Returns the current Asia/Dhaka date as YYYY-MM-DD. */
export function todayBD(): string {
  return bdDateString(new Date());
}

/** YYYY-MM-DD in Asia/Dhaka for a given Date (or now). */
export function bdDateString(d: Date = new Date()): string {
  return new Date(d.getTime() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Add `days` calendar days in BD time to the given date, returns YYYY-MM-DD. */
export function bdDateStringOffset(days: number, from: Date = new Date()): string {
  return bdDateString(new Date(from.getTime() + days * 86400_000));
}

/** UTC Date representing 00:00:00 Asia/Dhaka of today (or given date). */
export function startOfDayBD(d: Date = new Date()): Date {
  const ymd = bdDateString(d); // YYYY-MM-DD in BD
  // 00:00 BD == (YYYY-MM-DD)T00:00:00+06:00 == YYYY-MM-DD (previous day) 18:00 UTC
  return new Date(`${ymd}T00:00:00+06:00`);
}

/** ISO string for 00:00 Asia/Dhaka of today — use for `.gte("created_at", ...)`. */
export function startOfTodayBDISO(): string {
  return startOfDayBD().toISOString();
}

/** Localized bn-BD date, e.g. "৬ জুলাই, রবিবার", using Asia/Dhaka. */
export function formatBDDateLong(d: Date = new Date()): string {
  return d.toLocaleDateString("bn-BD", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Dhaka",
  });
}
