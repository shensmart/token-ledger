import assert from "node:assert/strict";
import { test } from "node:test";
import { compactTokens, fmtPct, fmtTokens, shortTokens } from "./format.ts";

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

test("shortTokens coarsens only what the pill cannot fit", () => {
  // Below 10M the extra digit is affordable, so precision is unchanged.
  assert.equal(shortTokens(6_500_000), "6.5M");
  assert.equal(shortTokens(9_990_000), "9.99M");
  assert.equal(shortTokens(999), "999");
  // At 10M and above the pill drops to one decimal.
  assert.equal(shortTokens(33_990_000), "34M");
  assert.equal(shortTokens(26_770_000), "26.8M");
  assert.equal(shortTokens(123_400_000), "123.4M");
  assert.equal(shortTokens(10_000_000), "10M");
  assert.equal(shortTokens(null), "–");
});

test("percentages round and keep sub-1% visible", () => {
  assert.equal(fmtPct(null), null);
  assert.equal(fmtPct(0), "0%");
  assert.equal(fmtPct(0.004), "<1%");
  assert.equal(fmtPct(0.474), "47%");
  assert.equal(fmtPct(1), "100%");
});
