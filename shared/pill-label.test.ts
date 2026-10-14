import assert from "node:assert/strict";
import { test } from "node:test";
import { estimateTextWidth, pillLabel, PILL_LABEL_WIDTH } from "./pill-label.ts";

test("usage and throughput share the label while it fits", () => {
  assert.equal(pillLabel({ usage: "6.5M·47%", throughput: null }), "6.5M·47%");
  assert.equal(pillLabel({ usage: "6.5M·47%", throughput: "74 t/s" }), "6.5M·47%·74 t/s");
  assert.equal(pillLabel({ usage: "26.77M·95%", throughput: "74 t/s" }), "26.77M·95%·74 t/s");
  assert.equal(pillLabel({ usage: "$0.43·90%", throughput: "123 t/s" }), "$0.43·90%·123 t/s");
});

test("a wide usage figure drops the throughput rather than clipping the label", () => {
  const label = pillLabel({ usage: "999.9M·100%", throughput: "999 t/s" });
  assert.equal(label, "999.9M·100%");
  assert.ok(estimateTextWidth(label) <= PILL_LABEL_WIDTH);
});

test("every kept label estimates within the pill's text budget", () => {
  for (const usage of ["6.5M·47%", "123.4M·100%", "12.3k·83%", "999 tok", "≈$0.43·90%", "1M·100%"]) {
    for (const throughput of [null, "3.6 t/s", "74 t/s", "999 t/s"]) {
      const label = pillLabel({ usage, throughput });
      if (label === usage) continue; // mandatory segment may be wide on its own
      assert.ok(estimateTextWidth(label) <= PILL_LABEL_WIDTH, `${label} = ${estimateTextWidth(label)}px`);
    }
  }
});

test("a mandatory usage segment survives on its own", () => {
  assert.equal(pillLabel({ usage: "999.9M·100%", throughput: null }), "999.9M·100%");
});
