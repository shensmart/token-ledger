import assert from "node:assert/strict";
import { test } from "node:test";
import { generationMs, isTerminalToolStatus, toolWaitMs } from "./toolTime.ts";

test("tool wait is the union, not the sum, of overlapping intervals", () => {
  // Shaped like a real capture: a 10.6s call spans several sub-second ones.
  const wait = toolWaitMs([
    { start: 0, end: 218 },
    { start: 8368, end: 8882 },
    { start: 17237, end: 27872 },
    { start: 20896, end: 20897 },
    { start: 23076, end: 23079 },
    { start: 25582, end: 25583 },
  ], 0, 60290);
  // 218 + 514 + the 10.6s span that swallows the three nested calls.
  assert.equal(wait, 11367);
  // Summing the six intervals instead gives 11372: 5ms of double counting,
  // exactly the three nested calls. The union is the correct figure.
  assert.ok(wait < 11372);
});

test("adjacent and out-of-order intervals still merge", () => {
  assert.equal(toolWaitMs([{ start: 200, end: 300 }, { start: 100, end: 200 }], 0, 1000), 200);
  assert.equal(toolWaitMs([{ start: 0, end: 100 }, { start: 300, end: 400 }], 0, 1000), 200);
});

test("intervals are clipped to the turn they belong to", () => {
  // A call straddling the turn start only counts from the start of the turn.
  assert.equal(toolWaitMs([{ start: -500, end: 100 }], 0, 1000), 100);
  // ...and one running past the end only counts up to the end.
  assert.equal(toolWaitMs([{ start: 900, end: 5000 }], 0, 1000), 100);
  assert.equal(toolWaitMs([{ start: 5000, end: 6000 }], 0, 1000), 0);
});

test("generation time subtracts tool wait and never reaches zero", () => {
  assert.equal(generationMs(10_000, 2000), 8000);
  assert.equal(generationMs(10_000, 0), 10_000);
  // A turn that was entirely tool calls has no generation window to divide by.
  assert.equal(generationMs(10_000, 10_000), null);
  assert.equal(generationMs(10_000, 99_999), null);
  assert.equal(generationMs(0, 0), null);
  assert.equal(generationMs(null, 0), null);
  // Negative or absent tool time must not inflate the denominator.
  assert.equal(generationMs(10_000, -5000), 10_000);
});

test("terminal statuses close a call, running does not", () => {
  for (const status of ["completed", "failed", "canceled"]) assert.ok(isTerminalToolStatus(status));
  for (const status of ["running", "", "unknown"]) assert.ok(!isTerminalToolStatus(status));
});
