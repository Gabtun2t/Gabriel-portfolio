import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateReconDataset } from '../src/data/recon/generate';
import { reconcile, normalizeRef, type ReconStatus } from '../src/engine/recon/match';
import { applyAll, applyCorrection } from '../src/engine/recon/corrections';
import { generateAmlDataset } from '../src/data/aml/generate';
import { fingerprint } from '../src/lib/prng';

const ds = generateReconDataset();
const run = reconcile(ds.source, ds.target, ds.staging);
const statusOf = (srcId: string) => run.results.find((r) => r.sourceId === srcId && r.status !== 'DUPLICATE_IN_TARGET')!.status;

describe('reconciliation dataset', () => {
  test('is reproducible', () => assert.equal(fingerprint(generateReconDataset()), fingerprint(ds)));
  test('has 176 source rows and 177 target entries', () => {
    assert.equal(ds.source.length, 176);
    assert.equal(ds.target.length, 177);
  });
  test('shares the S4/S5 references with the AML dataset (signature story)', () => {
    const aml = generateAmlDataset();
    for (const ref of ['RCPT-48807', 'RCPT-48812', 'RCPT-48830', 'RCPT-55821']) {
      const src = ds.source.find((s) => s.reference === ref)!;
      const amlTx = aml.transactions.find((t) => t.reference === ref)!;
      assert.equal(src.customerId, amlTx.customerId);
      assert.equal(src.postingDate, amlTx.date);
    }
    assert.equal(aml.erpDocuments.find((d) => d.reference === 'RCPT-55821')!.erpAmount, ds.source.find((s) => s.reference === 'RCPT-55821')!.amount);
  });
});

describe('baseline reconciliation', () => {
  test('produces the expected count per status', () => {
    // 150 clean + 4 within tolerance + the 4 originals whose second copy is the duplicate = 158 matched
    const expected: Record<ReconStatus, number> = {
      MATCHED: 158, MISSING_IN_TARGET: 5, DUPLICATE_IN_TARGET: 4, REFERENCE_CORRUPTED: 4,
      WRONG_MAPPING: 3, AMOUNT_MISMATCH: 3, DATE_MISMATCH: 3, UNMATCHED_IN_TARGET: 2,
    };
    assert.deepEqual(run.summary.byStatus, expected);
  });
  test('every seeded case lands in the matching status', () => {
    const map: Record<string, ReconStatus> = {
      clean: 'MATCHED', date_tolerance: 'MATCHED', missing: 'MISSING_IN_TARGET', duplicate: 'MATCHED',
      ref_encoding: 'REFERENCE_CORRUPTED', ref_format: 'REFERENCE_CORRUPTED', ref_truncated: 'REFERENCE_CORRUPTED', ref_transposed: 'REFERENCE_CORRUPTED',
      wrong_mapping: 'WRONG_MAPPING', amount_decimal: 'AMOUNT_MISMATCH', amount_transposed: 'AMOUNT_MISMATCH', amount_rounding: 'AMOUNT_MISMATCH', date_swapped: 'DATE_MISMATCH',
    };
    for (const [srcId, c] of Object.entries(ds.seededCase)) assert.equal(statusOf(srcId), map[c], `${srcId} (${c})`);
  });
  test('root causes are identified for each seeded defect type', () => {
    const codes = (c: string) => run.results.filter((r) => r.sourceId && ds.seededCase[r.sourceId] === c && r.status !== 'MATCHED').map((r) => r.rootCause.code);
    assert.deepEqual(codes('amount_decimal'), ['DECIMAL_SHIFT']);
    assert.deepEqual(codes('amount_transposed'), ['DIGIT_TRANSPOSITION']);
    assert.deepEqual(codes('amount_rounding'), ['ROUNDING']);
    assert.deepEqual([...new Set(codes('date_swapped'))], ['DATE_DAY_MONTH_SWAP']);
    assert.deepEqual(codes('ref_encoding'), ['REF_ENCODING']);
    assert.deepEqual(codes('ref_format'), ['REF_FORMAT']);
    assert.deepEqual(codes('ref_truncated'), ['REF_TRUNCATED']);
    assert.deepEqual(codes('ref_transposed'), ['REF_TRANSPOSED']);
    assert.deepEqual([...new Set(codes('missing'))], ['LOAD_REJECTED']);
    assert.deepEqual([...new Set(codes('duplicate'))], ['NON_IDEMPOTENT_RELOAD']);
  });
  test('within-tolerance date differences are matched with a note', () => {
    const tol = run.results.filter((r) => r.sourceId && ds.seededCase[r.sourceId] === 'date_tolerance');
    assert.equal(tol.length, 4);
    assert.ok(tol.every((r) => r.status === 'MATCHED' && r.notes.some((n) => n.includes('within'))));
  });
  test('reference normalization', () => {
    assert.equal(normalizeRef(' rcpt 45123 '), 'RCPT45123');
    assert.equal(normalizeRef('RCPT-451�23'), 'RCPT45123');
  });
  test('the matcher does not rely on lineage keys', () => {
    const stripped = ds.target.map((t) => ({ ...t, stagingRowId: null }));
    assert.deepEqual(reconcile(ds.source, stripped, ds.staging).summary.byStatus, run.summary.byStatus);
  });
});

describe('simulated corrections', () => {
  test('applying one correction changes exactly one result predictably', () => {
    const dup = run.results.find((r) => r.status === 'DUPLICATE_IN_TARGET')!;
    const { target } = applyCorrection(dup, ds.source, ds.target, []);
    const rerun = reconcile(ds.source, target, ds.staging);
    assert.equal(rerun.summary.byStatus.DUPLICATE_IN_TARGET, 3);
    assert.equal(rerun.summary.byStatus.MATCHED, 158);
  });
  test('applying every proposed correction leaves only the items that need human review', () => {
    const { target, journal } = applyAll(run.results, ds.source, ds.target);
    const rerun = reconcile(ds.source, target, ds.staging);
    assert.equal(journal.length, 22);
    assert.equal(rerun.summary.byStatus.MATCHED, 176);
    assert.equal(rerun.summary.byStatus.UNMATCHED_IN_TARGET, 2);
    assert.equal(rerun.summary.total, 178);
  });
  test('the manual journals cannot be auto-corrected', () => {
    const mj = run.results.filter((r) => r.status === 'UNMATCHED_IN_TARGET');
    assert.ok(mj.every((r) => r.correction === null));
    assert.throws(() => applyCorrection(mj[0], ds.source, ds.target, []));
  });
  test('corrections never mutate the original ledger', () => {
    const before = fingerprint(ds.target);
    applyAll(run.results, ds.source, ds.target);
    assert.equal(fingerprint(ds.target), before);
  });
});
