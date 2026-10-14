/**
 * Composer pill label fitting, kept in shared/ so it is unit-testable without a
 * host to render into.
 *
 * The host caps the composer pill's button at 160px. Measured on the desktop
 * client (12px system-ui, tabular numerals), the icon, gaps and padding take
 * 50px of that. Probing the remainder with whole labels puts the clip boundary
 * between a 110.9px label (renders) and a 112.9px label (ellipsized), so
 * PILL_LABEL_WIDTH is set just below that boundary.
 *
 * A measured advance-width table is used instead of a character count because
 * glyphs differ by up to 3x (`%` is 11.1px, `1` is 5.6px). Digits are tabular
 * but not equal width, so each is kept separate rather than averaged. Summing
 * per-glyph advances reads ~1% high against a whole-string measurement, which
 * is the direction to err.
 *
 * The label carries the token count and its cache hit rate. Context-window fill
 * is not repeated here: the chat surface already shows it beside the pill.
 */
const CHAR_WIDTH: Record<string, number> = {
  "0": 7.57, "1": 5.57, "2": 7.24, "3": 7.53, "4": 7.73, "5": 7.42, "6": 7.64, "7": 6.96, "8": 7.67, "9": 7.64,
  M: 10.49, k: 6.52, B: 9.4, "%": 11.11, ".": 3.57, "·": 3.57, " ": 3.38,
  "(": 4.59, ")": 4.59, $: 7.57, "≈": 7.57,
};
/** Fallback for glyphs measured elsewhere (CJK, other units). */
const DEFAULT_WIDTH = 7.6;
export const PILL_LABEL_WIDTH = 111;

/**
 * Estimated render width, rounded down so the estimate stays conservative:
 * keeping a label the host would clip is worse than dropping precision from one
 * that fits.
 */
export function estimateTextWidth(text: string): number {
  let width = 0;
  for (const char of text) width += CHAR_WIDTH[char] ?? DEFAULT_WIDTH;
  return Math.floor(width);
}

export type PillSegments = {
  /** Token count with its cache hit rate, or the cost when the model is priced. */
  usage: string;
  /** The same figure at coarser precision, e.g. `34M(96%)` for `33.99M(96%)`. */
  compactUsage: string;
};

/**
 * Fits the label into the measured width, preferring full precision and falling
 * back to the coarser form when the exact figure would be clipped. The result is
 * never empty: when even the coarse form is too wide it is returned anyway,
 * since a clipped number still beats a blank pill.
 */
export function pillLabel({ usage, compactUsage }: PillSegments): string {
  for (const candidate of [usage, compactUsage]) {
    if (estimateTextWidth(candidate) <= PILL_LABEL_WIDTH) return candidate;
  }
  return compactUsage;
}
