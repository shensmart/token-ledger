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

/**
 * A coarser `fmtTokens` for the composer pill, where width is capped: millions
 * keep one decimal instead of two, so `33.99M` becomes `34M`. Below 10M the
 * extra digit is worth keeping, so this matches `compactTokens` there.
 */
export function shortTokens(value: number | null): string {
  if (value === null || value < 10_000_000) return compactTokens(value);
  return `${(value / 1_000_000).toFixed(1)}M`.replace(/\.0M$/, "M");
}

export function fmtPct(ratio: number | null): string | null {
  if (ratio === null) return null;
  const pct = ratio * 100;
  if (pct > 0 && pct < 1) return "<1%";
  return `${Math.round(pct)}%`;
}
