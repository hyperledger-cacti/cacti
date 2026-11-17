/**
 * Presentation formatting helpers for the SATP inspector. Pure functions of
 * (value, reference time) so they are trivially unit-testable - components
 * pass `Date.now()` in production and a fixed reference in tests.
 */

/** Absolute, locale-formatted timestamp; `—` when unavailable. */
export function formatAbsoluteTime(ms?: number): string {
  return ms === undefined ? "—" : new Date(ms).toLocaleString();
}

/**
 * Human relative age of a timestamp, e.g. `just now`, `42s ago`, `3m ago`,
 * `5h ago`, `2d ago`. `—` when unavailable. Granularity matches monitoring
 * use: coarse buckets rather than clock precision.
 */
export function formatRelativeTime(
  ms?: number,
  nowMs: number = Date.now(),
): string {
  if (ms === undefined) {
    return "—";
  }
  const deltaMs = nowMs - ms;
  if (deltaMs < 0) {
    // Clock skew or a future timestamp - do not render a negative age.
    return "just now";
  }
  const seconds = Math.floor(deltaMs / 1000);
  if (seconds < 10) {
    return "just now";
  }
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Human duration for transfer elapsed times, e.g. `650ms`, `8.2s`,
 * `3m 12s`, `2h 5m`. `—` when unavailable. Negative inputs (clock skew)
 * are treated like a missing value instead of rendering nonsense.
 */
export function formatDuration(durationMs?: number): string {
  if (durationMs === undefined || durationMs < 0) {
    return "—";
  }
  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`;
  }
  const seconds = durationMs / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remSeconds = Math.round(seconds % 60);
  if (minutes < 60) {
    return remSeconds ? `${minutes}m ${remSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes ? `${hours}h ${remMinutes}m` : `${hours}h`;
}
