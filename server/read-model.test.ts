import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { finalizeTurn } from '../shared/aggregate.ts';
import type { TurnRow } from '../shared/ledger.ts';

function row(startedAt: string | null, endedAt: string, output: number): TurnRow {
  const record = finalizeTurn({
    agentId: 'a', turnId: 't', provider: 'codex', model: 'gpt-test',
    startedAt, endedAt, status: 'completed',
    observations: [], finalUsage: { inputTokens: 100, cachedInputTokens: 40, outputTokens: output },
    prevSessionCostUsd: null,
  });
  return { ...record, seq: 1, effectiveCostUsd: null, costSource: null, costBreakdown: null };
}

/**
 * `durationMs` exists so the composer pill and the panel can show an average
 * throughput. It must be summed like the token counts: a row with no timing
 * contributes nothing instead of dropping or double-counting a turn.
 */
test('summary duration sums per-turn wall clock and tolerates missing timings', async () => {
  const home = await mkdtemp(join(tmpdir(), 'token-ledger-read-model-test-'));
  const previousHome = process.env.PASEO_HOME;
  process.env.PASEO_HOME = home;
  try {
    const { summaryFromRows } = await import('./read-model.ts');
    const summary = summaryFromRows([
      row('2026-09-14T00:00:00.000Z', '2026-09-14T00:00:01.000Z', 10),
      row(null, '2026-09-14T00:00:05.000Z', 20),
      row('2026-09-14T00:00:10.000Z', '2026-09-14T00:00:13.000Z', 30),
    ]);
    assert.equal(summary.turns, 3);
    assert.equal(summary.output, 60);
    assert.equal(summary.durationMs, 4000);

    assert.equal(summaryFromRows([]).durationMs, 0);
  } finally {
    if (previousHome === undefined) delete process.env.PASEO_HOME;
    else process.env.PASEO_HOME = previousHome;
    await rm(home, { recursive: true, force: true });
  }
});
