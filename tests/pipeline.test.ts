import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generatePipelineDataset } from '../src/data/pipeline/generate';
import { runPipeline, traceFact, standardize, VALIDATION_RULES, type ValidationRuleId } from '../src/engine/pipeline/pipeline';
import { fingerprint } from '../src/lib/prng';

const ds = generatePipelineDataset();
const run = runPipeline(ds.raw);

describe('pipeline dataset', () => {
  test('is reproducible', () => assert.equal(fingerprint(generatePipelineDataset()), fingerprint(ds)));
  test('has 290 clean deliveries plus 26 seeded problem rows', () => {
    assert.equal(ds.raw.length, 316);
    assert.equal(Object.keys(ds.seededIssues).length, 26);
  });
});

describe('stages', () => {
  test('row counts per stage are stable', () => {
    assert.deepEqual(run.counts.map((c) => c.rows), [316, 316, 299, 290, 290]);
  });
  test('every seeded validation problem is quarantined with the right rule', () => {
    const expectRule: Record<string, ValidationRuleId> = { missing_key: 'V1_REQUIRED', bad_date: 'V2_DATE', non_positive: 'V3_AMOUNT', bad_currency: 'V4_CURRENCY', unknown_customer: 'V5_CUSTOMER' };
    for (const [rawId, issue] of Object.entries(ds.seededIssues)) {
      if (!(issue in expectRule)) continue;
      const q = run.quarantined.find((x) => x.record.rawId === rawId);
      assert.ok(q, `${rawId} (${issue}) should be quarantined`);
      assert.ok(q!.failures.some((f) => f.ruleId === expectRule[issue]), `${rawId} should fail ${expectRule[issue]}`);
    }
    assert.equal(run.quarantined.length, 17);
  });
  test('no clean row is quarantined', () => {
    for (const q of run.quarantined) assert.ok(ds.seededIssues[q.record.rawId], `${q.record.rawId} was not seeded as a problem`);
  });
  test('exact re-deliveries are dropped and key duplicates keep the latest version', () => {
    assert.equal(run.dedup.exactDuplicates.length, 6);
    assert.equal(run.dedup.keyDuplicates.length, 3);
    for (const k of run.dedup.keyDuplicates) assert.equal(ds.seededIssues[k.keptRawId], 'key_duplicate');
  });
  test('DD/MM/YYYY ERP dates are parsed and impossible dates rejected', () => {
    const ok = standardize({ rawId: 'x', source: 'erp_ar_receipts', ingestedAt: '', payload: { doc_no: 'A', receipt_date: '03/05/2026', customer_code: 'CUST-A01', amount: '1', currency_code: 'CAD' } });
    assert.equal(ok.txnDate, '2026-05-03');
    const bad = standardize({ rawId: 'y', source: 'erp_ar_receipts', ingestedAt: '', payload: { doc_no: 'B', receipt_date: '31/04/2026', customer_code: 'CUST-A01', amount: '1', currency_code: 'CAD' } });
    assert.equal(bad.txnDate, null);
  });
  test('EFT amounts are converted from cents and USD to CAD at the monthly rate', () => {
    const usd = run.facts.find((f) => f.currency === 'USD')!;
    assert.equal(usd.amountCad, Math.round(usd.amountOriginal * usd.fxRate! * 100) / 100);
    assert.ok(run.facts.filter((f) => f.channel === 'EFT').every((f) => f.amountOriginal >= 8 && f.amountOriginal <= 45000));
  });
});

describe('metrics and lineage', () => {
  test('monthly aggregates add up to the fact total', () => {
    const sum = run.metrics.monthlyByChannel.reduce((s, m) => s + m.amountCad, 0);
    assert.ok(Math.abs(sum - run.metrics.totalCad) < 0.01);
  });
  test('data quality dimensions are computed from the data', () => {
    assert.ok(run.metrics.dq.completeness < 1 && run.metrics.dq.completeness > 0.95);
    assert.ok(run.metrics.dq.uniqueness < 1);
  });
  test('every fact traces back to at least one raw record, and duplicates are kept in lineage', () => {
    for (const f of run.facts) assert.ok(f.lineageRawIds.length >= 1);
    const merged = run.facts.filter((f) => f.lineageRawIds.length > 1);
    assert.equal(merged.length, 9);
    const t = traceFact(run, ds.raw, merged[0].paymentKey)!;
    assert.equal(t.raw.length, merged[0].lineageRawIds.length);
  });
  test('disabling the currency rule lets unconvertible rows through and is visible in metrics', () => {
    const enabled = new Set(VALIDATION_RULES.map((v) => v.id).filter((id) => id !== 'V4_CURRENCY'));
    const r = runPipeline(ds.raw, enabled);
    assert.equal(r.metrics.unconverted, 3);
    assert.equal(r.metrics.totalCad, run.metrics.totalCad);
  });
});
