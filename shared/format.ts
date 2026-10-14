/**
 * Numeric formatting shared by the server-derived read model and the client
 * views. Kept free of React and Paseo imports so the same code renders in the
 * panel, the overview, and the composer pill — and can be unit tested directly.
 */

export function fmtTokens(value: number | null): string {
  if (value === null) return "–";
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(1)}k`;
  return `${(value / 1_000_000).toFixed(2)}M`;
}

/** `fmtTokens` without trailing zeros: `6.50M` becomes `6.5M`, `1.00M` `1M`. */
export function compactTokens(value: number | null): string {
  return fmtTokens(value).replace(/\.?0+([kM])$/, "$1");
}

export function fmtPct(ratio: number | null): string | null {
  if (ratio === null) return null;
  const pct = ratio * 100;
  if (pct > 0 && pct < 1) return "<1%";
  return `${Math.round(pct)}%`;
}

/**
 * Average output throughput: output tokens per second of wall clock.
 *
 * Paseo exposes no per-token or first-token timing, so this is derived from a
 * turn's `startedAt`/`endedAt` span. That span covers thinking, tool calls, and
 * waiting for the provider, so the value is a floor on generation speed rather
 * than the model's token rate — it should never be presented as the latter.
 * Null without both an output count and a measured duration.
 */
export function fmtThroughput(output: number | null, durationMs: number | null, unit = "tok/s"): string | null {
  if (output === null || durationMs === null || output <= 0 || durationMs <= 0) return null;
  const perSecond = output / (durationMs / 1000);
  if (!Number.isFinite(perSecond) || perSecond <= 0) return null;
  // Below 10 the integer part is too coarse; above it the decimal is noise.
  return `${perSecond < 10 ? perSecond.toFixed(1) : Math.round(perSecond)} ${unit}`;
}
