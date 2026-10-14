import assert from "node:assert/strict";
import { test } from "node:test";
import { estimateTextWidth, pillLabel, PILL_LABEL_WIDTH, PILL_SEPARATOR } from "./pill-label.ts";

const at = (usage: string, compactUsage = usage, throughput: string | null = null) =>
  pillLabel({ usage, compactUsage, throughput });

test("usage and throughput share the label while it fits", () => {
  assert.equal(at("6.5M(47%)"), "6.5M(47%)");
  assert.equal(at("6.5M(47%)", "6.5M(47%)", "70t/s"), `6.5M(47%)${PILL_SEPARATOR}70t/s`);
  assert.equal(at("12.3k(83%)", "12.3k(83%)", "3.6t/s"), `12.3k(83%)${PILL_SEPARATOR}3.6t/s`);
});

test("full precision is kept while the label still fits the measured boundary", () => {
  // 33.99M(96%) 70t/s measures 109px on the client with the thin-space
  // separator (111px with a plain space, which is the width that clips), so the
  // exact count stays; the coarse form is only a fallback.
  assert.equal(at("33.99M(96%)", "34M(96%)", "70t/s"), `33.99M(96%)${PILL_SEPARATOR}70t/s`);
  assert.ok(estimateTextWidth(`33.99M(96%)${PILL_SEPARATOR}70t/s`) <= PILL_LABEL_WIDTH);
  // A label past the boundary falls back to the coarse count, not to no speed.
  assert.equal(at("123.49M(96%)", "123M(96%)", "70t/s"), `123M(96%)${PILL_SEPARATOR}70t/s`);
});

test("throughput is given up only when even the coarse form cannot fit", () => {
  assert.equal(at("999.9M(100%)", "1000M(100%)", "999t/s"), "999.9M(100%)");
});

test("a label keeps the throughput only when it fits the budget", () => {
  const cases: Array<[string, string, string]> = [
    ["6.5M(47%)", "6.5M(47%)", "70t/s"],
    ["33.99M(96%)", "34M(96%)", "70t/s"],
    ["123.49M(96%)", "123M(96%)", "70t/s"],
    ["26.77M(95%)", "26.8M(95%)", "70t/s"],
    ["12.3k(83%)", "12.3k(83%)", "3.6t/s"],
    ["999.9M(100%)", "1000M(100%)", "999t/s"],
    ["≈$0.43(90%)", "≈$0.43(90%)", "70t/s"],
  ];
  for (const [usage, compactUsage, throughput] of cases) {
    const label = at(usage, compactUsage, throughput);
    const keptThroughput = label.endsWith(throughput);
    if (keptThroughput) {
      assert.ok(estimateTextWidth(label) <= PILL_LABEL_WIDTH, `${label} = ${estimateTextWidth(label)}px`);
    } else {
      // Dropping it must have been necessary: nothing with it would have fit.
      assert.ok(estimateTextWidth(`${usage}${PILL_SEPARATOR}${throughput}`) > PILL_LABEL_WIDTH);
      assert.ok(estimateTextWidth(`${compactUsage}${PILL_SEPARATOR}${throughput}`) > PILL_LABEL_WIDTH);
    }
  }
});

test("a mandatory usage segment survives on its own", () => {
  assert.equal(at("999.9M(100%)", "1000M(100%)"), "999.9M(100%)");
});
