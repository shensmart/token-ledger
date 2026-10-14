import assert from "node:assert/strict";
import { test } from "node:test";
import { estimateTextWidth, pillLabel, PILL_LABEL_WIDTH } from "./pill-label.ts";

test("the exact figure is kept while it fits the measured budget", () => {
  // The clip boundary sits between 110.9px (renders) and 112.9px (ellipsized).
  assert.equal(pillLabel({ usage: "6.5M(47%)", compactUsage: "6.5M(47%)" }), "6.5M(47%)");
  assert.equal(pillLabel({ usage: "33.99M(96%)", compactUsage: "34M(96%)" }), "33.99M(96%)");
  assert.equal(pillLabel({ usage: "123.49M(96%)", compactUsage: "123M(96%)" }), "123.49M(96%)");
  assert.equal(pillLabel({ usage: "$0.43(90%)", compactUsage: "$0.43(90%)" }), "$0.43(90%)");
});

test("a figure too wide for the budget falls back to the coarser form", () => {
  // Synthetic widths, since a real session never formats this wide.
  const usage = "8888888888888888888(100%)";
  const compactUsage = "88888888888888888888(100%)";
  assert.ok(estimateTextWidth(usage) > PILL_LABEL_WIDTH);
  assert.equal(pillLabel({ usage, compactUsage }), compactUsage);
});

test("a label is never empty, even when both forms overflow", () => {
  const usage = "9".repeat(40);
  const compactUsage = "8".repeat(41);
  assert.equal(pillLabel({ usage, compactUsage }), compactUsage);
});

test("the figures the pill can actually produce all fit the budget", () => {
  // Widest shapes reachable from a real session once the throughput is gone.
  for (const label of [
    "999.9k(100%)", "6.50M(100%)", "999.99M(100%)", "12345.67M(100%)",
    "≈$999.99(100%)", "$0.0001(100%)",
  ]) {
    assert.ok(estimateTextWidth(label) <= PILL_LABEL_WIDTH, `${label} = ${estimateTextWidth(label)}px`);
  }
});
