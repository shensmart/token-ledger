import assert from "node:assert/strict";
import { test } from "node:test";
import { compactTokens, fmtPct, fmtThroughput, fmtTokens } from "./format.ts";

test("token counts keep the panel's magnitude formatting", () => {
  assert.equal(fmtTokens(null), "–");
  assert.equal(fmtTokens(999), "999");
  assert.equal(fmtTokens(12_400), "12.4k");
  assert.equal(fmtTokens(6_500_000), "6.50M");
});

test("compactTokens drops only trailing zeros, keeping other precision", () => {
  assert.equal(compactTokens(6_500_000), "6.5M");
  assert.equal(compactTokens(1_000_000), "1M");
  assert.equal(compactTokens(12_340_000), "12.34M");
  assert.equal(compactTokens(12_400), "12.4k");
  assert.equal(compactTokens(1_000), "1k");
  assert.equal(compactTokens(999), "999");
  assert.equal(compactTokens(null), "–");
});

test("percentages round and keep sub-1% visible", () => {
  assert.equal(fmtPct(null), null);
  assert.equal(fmtPct(0), "0%");
  assert.equal(fmtPct(0.004), "<1%");
  assert.equal(fmtPct(0.474), "47%");
  assert.equal(fmtPct(1), "100%");
});

test("throughput is output over measured wall clock", () => {
  assert.equal(fmtThroughput(10_000, 10_000), "1000 tok/s");
  assert.equal(fmtThroughput(45, 1000), "45 tok/s");
  // Sub-10 values keep a decimal: whole numbers would round 3.6 and 4.4 alike.
  assert.equal(fmtThroughput(3_600, 1_000_000), "3.6 tok/s");
});

test("throughput uses the requested unit and stays silent without both inputs", () => {
  assert.equal(fmtThroughput(44, 1000, "t/s"), "44 t/s");
  assert.equal(fmtThroughput(null, 1000), null);
  assert.equal(fmtThroughput(44, null), null);
  assert.equal(fmtThroughput(0, 1000), null);
  assert.equal(fmtThroughput(44, 0), null);
});
