/**
 * ============================================================
 * SCHEDULED SHUTDOWN (developer agreement)
 *
 * TO DISABLE EVERYTHING, CHANGE THIS ONE LINE:
 *   export const SHUTDOWN_ENABLED = false;
 * ============================================================
 *
 * Timeline (Asia/Dhaka, UTC+6):
 *  - 11:00  → admin panel shows a 1-hour countdown screen
 *  - 12:00  → the entire site shows the white "404" deleted screen
 */

export const SHUTDOWN_ENABLED = false;

/** Countdown starts (11:00 BD). */
export const WARNING_START = new Date("2026-09-15T11:00:00+06:00").getTime();

/** Countdown ends & site lock begins (12:00 BD). */
export const SHUTDOWN_AT = new Date("2026-09-15T12:00:00+06:00").getTime();

export type ShutdownPhase = "idle" | "warning" | "down";

export function shutdownPhaseAt(now: number): ShutdownPhase {
  if (!SHUTDOWN_ENABLED) return "idle";
  if (now >= SHUTDOWN_AT) return "down";
  if (now >= WARNING_START) return "warning";
  return "idle";
}
