/**
 * Composer pill label assembly, kept in shared/ so the exact segmentation is
 * unit-testable without a host to render into.
 *
 * The host caps the composer pill's button at 160px. Measured on the desktop
 * client (12px system-ui, tabular numerals), the icon, gaps and padding take
 * 50px of that. Probing the remainder with whole labels puts the clip boundary
 * between a 110.9px label (renders) and a 112.9px label (ellipsized), so
 * PILL_LABEL_WIDTH is set below that boundary to leave room for the host's
 * sub-pixel rounding.
 *
 * A measured advance-width table is used instead of a character count because
 * the glyphs differ by up to 3x (`%` is 11.1px, while `1` and `(` are ~5.6px).
 * Digits are tabular but not equal width, so each is kept separate rather than
 * approximated by an average. Summing per-glyph advances reads ~1% high against
 * a whole-string measurement (sub-pixel rounding accumulates), which is the
 * direction to err: the budget below is calibrated against real labels.
 *
 * The label carries usage and throughput only. Context-window fill is already
 * visible in the chat surface next to the pill, so spending pill width on it
 * would duplicate the host at the expense of the number that cannot be seen
 * there — the average throughput.
 */
const CHAR_WIDTH: Record<string, number> = {
  "0": 7.57, "1": 5.57, "2": 7.24, "3": 7.53, "4": 7.73, "5": 7.42, "6": 7.64, "7": 6.96, "8": 7.67, "9": 7.64,
  M: 10.49, k: 6.52, B: 9.4, t: 4.36, s: 6.23, "%": 11.11, ".": 3.57, "/": 3.66,
  "·": 3.57, " ": 3.38, "(": 4.59, ")": 4.59, $: 7.57, "≈": 7.57,
  // The pill's own separator: a thin space. It reads as a normal space but
  // measures ~1.4px against ~3.4px, which is the difference between
  // `33.99M(96%) 70t/s` fitting (109px) and clipping (111px) at the boundary.
  "\u2009": 1.4,
};
/** Fallback for glyphs measured elsewhere (CJK, other units). */
const DEFAULT_WIDTH = 7.6;
export const PILL_LABEL_WIDTH = 111;

/** Between a usage figure and its throughput. See the width note above. */
export const PILL_SEPARATOR = "\u2009";

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
  /** Usage at full precision: token count with its cache hit rate, or the cost. */
  usage: string;
  /**
   * The same usage at coarser precision (e.g. `34M(96%)` for `33.99M(96%)`),
   * tried before giving up on the throughput. Equal to `usage` when there is
   * nothing to trim.
   */
  compactUsage: string;
  /** Throughput, e.g. `70t/s`. */
  throughput: string | null;
};

/**
 * Fits the label into the measured width by trying, in order:
 *
 * 1. full-precision usage + throughput,
 * 2. coarser usage + throughput,
 * 3. full-precision usage alone,
 * 4. coarser usage alone.
 *
 * Throughput is protected ahead of the last digit of precision: a session's
 * speed cannot be read anywhere else in the host, while the exact token count
 * is one press away in the panel. The usage segment is mandatory — when even
 * the coarser form is too wide it is returned anyway, since a clipped number
 * still beats an empty pill.
 */
export function pillLabel({ usage, compactUsage, throughput }: PillSegments): string {
  const candidates = throughput
    ? [
        `${usage}${PILL_SEPARATOR}${throughput}`,
        `${compactUsage}${PILL_SEPARATOR}${throughput}`,
        usage,
        compactUsage,
      ]
    : [usage, compactUsage];
  return candidates.find((candidate) => estimateTextWidth(candidate) <= PILL_LABEL_WIDTH) ?? candidates.at(-1)!;
}
