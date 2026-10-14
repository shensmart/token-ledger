/**
 * Derives the time a turn spent waiting on tool calls, so the speed figure can
 * be computed over generation time instead of total wall clock.
 *
 * This is the only correction the event stream actually supports. Thinking time
 * cannot be separated the same way: `reasoning` items are delivered as a burst
 * at the end of a thought (observed intervals of ~60-70ms between items after
 * many seconds of silence), so their timestamps bracket when thinking stopped,
 * not how long it ran, and the gap before them is indistinguishable from
 * prefill or provider latency. Anything else "subtracted" here would be a
 * guess, so this module deliberately subtracts only tool calls.
 *
 * Paseo emits each tool call twice — a `running` event and a terminal one —
 * each with a timestamp. Pairing them by `callId` yields the interval the tool
 * held the turn. Overlapping intervals are common (a long call can span shorter
 * ones), so the total is the **union**, not the sum; summing would over-subtract
 * and could even push the denominator negative.
 *
 * Only `callId` + `status` + the event timestamp are used, so this works for
 * every tool type without depending on per-tool `durationMs` (which shell calls
 * left null in a real capture).
 */

export type ToolInterval = { start: number; end: number };

/** Terminal statuses that close a call. `running` (re)opens one. */
const TERMINAL = new Set(["completed", "failed", "canceled"]);

/**
 * Reduces tool intervals to the milliseconds during which at least one tool was
 * in flight. The union — not the sum — is what tool wait actually is: a long
 * call can span shorter ones, and summing would over-subtract, potentially
 * past the turn's own duration. Intervals are clipped to `[fromMs, toMs]` so a
 * call that straddles a turn boundary only counts inside it.
 */
export function toolWaitMs(intervals: readonly ToolInterval[], fromMs: number, toMs: number): number {
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) return 0;
  const clipped = intervals
    .map((interval) => ({ start: Math.max(interval.start, fromMs), end: Math.min(interval.end, toMs) }))
    .filter((interval) => interval.end > interval.start)
    .sort((a, b) => a.start - b.start);
  if (clipped.length === 0) return 0;
  let total = 0;
  let currentStart = clipped[0]!.start;
  let currentEnd = clipped[0]!.end;
  for (const interval of clipped.slice(1)) {
    if (interval.start <= currentEnd) {
      currentEnd = Math.max(currentEnd, interval.end);
    } else {
      total += currentEnd - currentStart;
      currentStart = interval.start;
      currentEnd = interval.end;
    }
  }
  return Math.round(total + (currentEnd - currentStart));
}

/**
 * Speed denominator for a turn: wall clock minus tool wait, clamped so it can
 * never reach zero. Null when the whole turn was tool calls, since there is then
 * no generation window to divide by.
 */
export function generationMs(durationMs: number | null, toolMs: number): number | null {
  if (durationMs === null || durationMs <= 0) return null;
  const generation = durationMs - Math.min(Math.max(toolMs, 0), durationMs);
  return generation > 0 ? generation : null;
}

/** True when the status string closes a tool call. */
export function isTerminalToolStatus(status: string): boolean {
  return TERMINAL.has(status);
}
