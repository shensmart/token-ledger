import type { PluginTheme } from "@getpaseo/plugin";
import { Text, View } from "react-native";
import type { Summary, TurnRecord } from "../shared/ledger.ts";
import { cacheRatio } from "../shared/pricing.ts";
// Formatting lives in shared/ so the pill, panel, and overview render identically.
import { fmtPct, fmtTokens } from "../shared/format.ts";
export { fmtPct, fmtTokens } from "../shared/format.ts";

export function fmtCost(value: number | null): string | null {
  if (value === null) return null;
  return value >= 0.01 ? `$${value.toFixed(2)}` : `$${value.toFixed(4)}`;
}

/** Cost when priced, else total tokens. "≈" marks a cost that includes estimates. */
export function costOrTokens(summary: Summary): string {
  const cost = fmtCost(summary.effectiveCostUsd);
  if (cost) return `${summary.estimatedTurns > 0 ? "≈" : ""}${cost}`;
  return `${fmtTokens(summary.input + summary.cached + (summary.cacheWrite ?? 0) + summary.output)} tok`;
}

/** Compact cost for per-component cells; "–" when unknown. */
export function fmtCostSmall(value: number | null): string {
  if (value === null) return "–";
  if (value === 0) return "$0";
  if (value >= 0.01) return `$${value.toFixed(2)}`;
  return `$${value.toPrecision(1)}`;
}

/**
 * Signed cost residual (reported total minus list-price component estimate)
 * for the COST cell; blank when unknown or negligible. On Claude turns a
 * positive residual is mostly cache writes, which upstream never reports as
 * tokens.
 */
export function fmtResidual(value: number | null): string {
  if (value === null || Math.abs(value) < 0.005) return " ";
  return `${value > 0 ? "+" : "−"}${fmtCostSmall(Math.abs(value))}`;
}

export function fmtDuration(ms: number | null): string {
  if (ms === null) return "–";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function fmtTime(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  if (date.toDateString() === today.toDateString()) return time;
  return `${date.getMonth() + 1}/${date.getDate()} ${time}`;
}

export function statusColor(status: TurnRecord["status"], theme: PluginTheme): string {
  if (status === "completed") return theme.colors.statusSuccess;
  if (status === "failed") return theme.colors.statusDanger;
  return theme.colors.statusWarning;
}

export function tokensLine(input: number | null, cached: number | null, output: number | null, cacheWrite?: number | null): string | null {
  if (input === null && cached === null && output === null && cacheWrite == null) return null;
  const pct = fmtPct(cacheRatio(input, cached, cacheWrite));
  return `in ${fmtTokens(input)} · cache ${fmtTokens(cached)}${pct ? ` (${pct})` : ''}${cacheWrite != null ? ` · write ${fmtTokens(cacheWrite)}` : ''} · out ${fmtTokens(output)}`;
}

/**
 * Column widths for the TURNS table, shared by the header and the data rows.
 *
 * These are fixed `width` values rather than `minWidth` on purpose. Each row is
 * its own flex container, so a `minWidth` column grows to fit its content and
 * the header's copy of that column does not: the wider data cell pushed the
 * flexed first column narrower and shifted every column after it, leaving the
 * headers sitting off to one side of the numbers they label.
 */
export function turnColumns(dense: boolean) {
  // `flexShrink: 0` on every column is what keeps the header's cells the same
  // size as the data's. A column that is allowed to shrink resolves against its
  // own parent, so the header and each row could settle on different widths.
  const fixed = (value: number) => ({ width: value, flexShrink: 0 });
  return {
    // The leading column is fixed too, not flexed. Each row is its own flex
    // container, so a flexed column resolves against that row's siblings: the
    // header's copy absorbed a different remainder than the data's and every
    // following column shifted by the difference.
    turns: fixed(dense ? 74 : 96),
    // Values here are strings whose width does not shrink with the column, so
    // each is sized for its widest reachable text: `120.33M(97%)` under CACHE,
    // `≈$0.0044` under COST, and `36m 37s ≈` under TURNS.
    in: fixed(dense ? 40 : 56),
    cache: fixed(dense ? 84 : 92),
    out: fixed(dense ? 42 : 56),
    cost: fixed(dense ? 56 : 60),
    // 4px in the dense pane: the columns' widest content needs 282px and the
    // 300px panel leaves 276 after gaps, so a 6px gutter overflowed by 6px and
    // clipped both ends of the row.
    gap: dense ? 3 : 8,
  };
}

export function TurnTableHeader({ theme, dense }: { theme: PluginTheme; dense: boolean }) {
  const cols = turnColumns(dense);
  const cell = {
    color: theme.colors.foregroundMuted,
    fontSize: 10,
    fontWeight: "600" as const,
    letterSpacing: 0.4,
    // Centered like the data beneath it. Data cells are right-aligned within
    // their column, so a header left at its own start sat over the wrong part
    // of a wide value such as `120.33M(97%)`.
    textAlign: "center" as const,
  };
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: cols.gap, paddingVertical: 4 }}>
      {/* Doubles as the section title; the column holds seq + time + duration. */}
      <Text style={{ ...cell, textAlign: "left", ...cols.turns }}>TURNS</Text>
      <Text style={{ ...cell, ...cols.in }}>IN</Text>
      <Text style={{ ...cell, ...cols.cache }}>CACHE</Text>
      <Text style={{ ...cell, ...cols.out }}>OUT</Text>
      <Text style={{ ...cell, ...cols.cost }}>COST</Text>
    </View>
  );
}

/**
 * One summary figure and its label. Both are centered on the same axis, because
 * a value can be several times wider than its label (`120.33M(97%)` over
 * `cache`); left-aligning both would leave the label adrift under the left edge
 * of a much wider figure.
 */
export function Stat({ label, value, theme, dense }: { label: string; value: string; theme: PluginTheme; dense?: boolean }) {
  return (
    <View style={{ minWidth: dense ? 44 : 56, alignItems: "center" }}>
      <Text style={{ color: theme.colors.foreground, fontSize: 15, fontWeight: "600", fontVariant: ["tabular-nums"], textAlign: "center" }}>
        {value}
      </Text>
      <Text style={{ color: theme.colors.foregroundMuted, fontSize: 11, textAlign: "center" }}>{label}</Text>
    </View>
  );
}

export function SummaryRow({ summary, theme, dense }: { summary: Summary; theme: PluginTheme; dense?: boolean }) {
  const cost = fmtCost(summary.effectiveCostUsd);
  const costValue = cost ? `${summary.estimatedTurns > 0 ? "≈" : ""}${cost}` : null;
  const costLabel = summary.unpricedTurns > 0 ? `cost · ${summary.unpricedTurns} unknown` : summary.estimatedTurns > 0 ? "cost · estimated" : "cost";
  const hit = fmtPct(cacheRatio(summary.input, summary.cached, summary.cacheWrite));
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: dense ? 10 : 16 }}>
      <Stat label="turns" value={String(summary.turns)} theme={theme} dense={dense} />
      <Stat label="input" value={fmtTokens(summary.input)} theme={theme} dense={dense} />
      {/* The hit rate rides on the count it qualifies, so it costs no extra
          column and cannot be read as a separate measurement. */}
      <Stat label="cache" value={hit ? `${fmtTokens(summary.cached)}(${hit})` : fmtTokens(summary.cached)} theme={theme} dense={dense} />
      {summary.cacheWrite != null ? <Stat label="cache write" value={fmtTokens(summary.cacheWrite)} theme={theme} dense={dense} /> : null}
      <Stat label="output" value={fmtTokens(summary.output)} theme={theme} dense={dense} />
      {costValue ? <Stat label={costLabel} value={costValue} theme={theme} dense={dense} /> : null}
    </View>
  );
}

export function UsageCoverageNote({ theme }: { theme: PluginTheme }) {
  return (
    <Text style={{ color: theme.colors.foregroundMuted, fontSize: 11 }}>
      Totals reflect usage available from Paseo; subagent usage and cache writes may be missing.
    </Text>
  );
}
