/**
 * Composer pill label assembly, kept in shared/ so the exact segmentation is
 * unit-testable without a host to render into.
 *
 * The host caps the composer pill's button at 160px. Measured on the desktop
 * client (12px system-ui, tabular numerals), the icon, gaps and padding take
 * 50px of that, leaving 110px for the label before the host ellipsizes it.
 *
 * A measured advance-width table is used instead of a character count because
 * the glyphs differ by up to 3x (`%` is 11.1px, `1` is 5.6px). The numbers are
 * averaged per glyph from a live probe; the digits are tabular but not equal
 * width, so each is kept separate rather than approximated by an average.
 *
 * The label carries usage and throughput only. Context-window fill is already
 * visible in the chat surface next to the pill, so spending pill width on it
 * would duplicate the host at the expense of the number that cannot be seen
 * there — the average throughput.
 */
const CHAR_WIDTH: Record<string, number> = {
  "0": 7.57, "1": 5.57, "2": 7.24, "3": 7.53, "4": 7.73, "5": 7.42, "6": 7.64, "7": 6.96, "8": 7.67, "9": 7.64,
  M: 10.49, k: 6.52, t: 4.36, s: 6.23, "%": 11.11, ".": 3.57, "/": 3.66, "·": 3.57, " ": 3.38, $: 7.57, "≈": 7.57,
};
/** Fallback for glyphs measured elsewhere (CJK, other units). */
const DEFAULT_WIDTH = 7.6;
export const PILL_LABEL_WIDTH = 110;

/**
 * Estimated render width, rounded down so the estimate stays conservative:
 * keeping a segment the host would clip is worse than dropping one that fits.
 */
export function estimateTextWidth(text: string): number {
  let width = 0;
  for (const char of text) width += CHAR_WIDTH[char] ?? DEFAULT_WIDTH;
  return Math.floor(width);
}

export type PillSegments = {
  /** Usage: the token count with its cache hit rate, or the cost. Mandatory. */
  usage: string;
  /** Average throughput, e.g. `74 t/s`. Dropped when the label would overflow. */
  throughput: string | null;
};

/**
 * Drops the optional throughput when the whole label would not fit. The usage
 * segment is mandatory: when it alone is too wide it is returned anyway, since
 * a clipped number still beats an empty pill.
 */
export function pillLabel({ usage, throughput }: PillSegments): string {
  if (!throughput) return usage;
  const label = `${usage}·${throughput}`;
  return estimateTextWidth(label) <= PILL_LABEL_WIDTH ? label : usage;
}
