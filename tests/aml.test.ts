import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateAmlDataset, SCENARIOS, AML_SEED } from '../src/data/aml/generate';
import { runDetection, buildEvidence, correctedTransactions, bandFor, scoreAlert } from '../src/engine/aml/alerts';
import {
  r1HighVelocity, r2LargeVsProfile, r3CashJustBelowThreshold, r4InflowExceedsProfile,
  r5DuplicatePosting, r6RapidPassThrough, r7ProfileInconsistency, evaluateCustomer,
} from '../src/engine/aml/rules';
import { validateDisposition, closeEligibility, buildNarrative } from '../src/engine/aml/disposition';
import { fingerprint } from '../src/lib/prng';
import type { Customer, Transaction } from '../src/data/aml/types';

const ds = generateAmlDataset();
const alerts = runDetection(ds);
const alertFor = (customerId: string) => alerts.find((a) => a.customerId === customerId)!;

// --- Minimal fixtures for unit-level rule tests -------------------------------------------
const customer = (over: Partial<Customer> = {}): Customer => ({
  customerId: 'CUS-T', name: 'Test', type: 'individual', segment: 'retail', activity: 'x', accountPurpose: 'Personal chequing',
  declaredMonthlyTurnover: 5000, expectedMonthlyTxCount: 12, accountOpened: '2020-01-01', kycStatus: 'verified',
  kycLastReview: '2026-01-01', riskFactors: [], riskRating: 'low', accountId: 'ACC-T', internationalExpected: false,
  documents: [], scenarioId: null, ...over,
});
let n = 0;
const tx = (over: Partial<Transaction>): Transaction => ({
  txId: `T${++n}`, customerId: 'CUS-T', accountId: 'ACC-T', date: '2026-05-01', amount: 100, direction: 'credit', channel: 'eft',
  counterparty: 'A', counterpartyCountry: 'CA', reference: `REF-${n}`, branch: null, sourceSystem: 'CORE_LIVE', migrationBatch: null, loadRun: null, ...over,
});

describe('synthetic dataset', () => {
  test('is reproducible from the documented seed', () => {
    const again = generateAmlDataset(AML_SEED);
    assert.equal(fingerprint(again), fingerprint(ds));
  });
  test('a different seed produces a different baseline', () => {
    assert.notEqual(fingerprint(generateAmlDataset(1)), fingerprint(ds));
  });
  test('has 40 fictional customers and every transaction belongs to one', () => {
    assert.equal(ds.customers.length, 40);
    const ids = new Set(ds.customers.map((c) => c.customerId));
    assert.ok(ds.transactions.every((t) => ids.has(t.customerId)));
  });
  test('risk factors never reference demographic attributes', () => {
    const banned = /(age|gender|nationality|ethnic|religion|birth|citizen|name)/i;
    for (const c of ds.customers) for (const f of c.riskFactors) assert.ok(!banned.test(f), `${c.customerId}: ${f}`);
  });
});

describe('detection on the seeded dataset', () => {
  test('only seeded scenario customers generate alerts (baseline stays clean)', () => {
    const alerted = new Set(alerts.map((a) => a.customerId));
    assert.deepEqual([...alerted].sort(), SCENARIOS.map((s) => s.customerId).sort());
  });
  for (const s of SCENARIOS) {
    test(`${s.scenarioId} ${s.title} triggers exactly ${s.expectedRules.join(', ')}`, () => {
      assert.deepEqual(alertFor(s.customerId).hits.map((h) => h.ruleId).sort(), [...s.expectedRules].sort());
    });
  }
  test('at least six documented scenarios exist', () => assert.ok(SCENARIOS.length >= 6));
  test('case IDs are unique and stable', () => {
    assert.equal(new Set(alerts.map((a) => a.caseId)).size, alerts.length);
    assert.deepEqual(runDetection(generateAmlDataset()).map((a) => a.caseId), alerts.map((a) => a.caseId));
  });
});

describe('rule unit tests', () => {
  test('R1 fires at the threshold and not below it', () => {
    const c = customer({ expectedMonthlyTxCount: 12 }); // threshold = max(10, 8.3) = 10
    const nine = Array.from({ length: 9 }, (_, i) => tx({ date: `2026-05-0${1 + (i % 7)}` }));
    assert.equal(r1HighVelocity(c, nine), null);
    const ten = [...nine, tx({ date: '2026-05-03' })];
    assert.equal(r1HighVelocity(c, ten)?.observed, 10);
  });
  test('R2 uses the greater of 3× turnover and $10,000', () => {
    const c = customer({ declaredMonthlyTurnover: 2000 });
    assert.equal(r2LargeVsProfile(c, [tx({ amount: 9999 })]), null);
    assert.ok(r2LargeVsProfile(c, [tx({ amount: 10000 })]));
  });
  test('R3 needs three cash deposits in the 9,000–9,999.99 band within 7 days', () => {
    const c = customer();
    const two = [tx({ channel: 'cash', amount: 9500, date: '2026-06-01' }), tx({ channel: 'cash', amount: 9600, date: '2026-06-03' })];
    assert.equal(r3CashJustBelowThreshold(c, two), null);
    assert.ok(r3CashJustBelowThreshold(c, [...two, tx({ channel: 'cash', amount: 9999.99, date: '2026-06-07' })]));
    assert.equal(r3CashJustBelowThreshold(c, [...two, tx({ channel: 'cash', amount: 10000, date: '2026-06-04' })]), null, '$10,000 exactly is outside the band');
    assert.equal(r3CashJustBelowThreshold(c, [...two, tx({ channel: 'cash', amount: 9500, date: '2026-06-08' })]), null, 'outside the 7-day window');
  });
  test('R4 compares calendar-month credits with 3× turnover', () => {
    const c = customer({ declaredMonthlyTurnover: 1000 });
    assert.equal(r4InflowExceedsProfile(c, [tx({ amount: 2999 })]), null);
    assert.ok(r4InflowExceedsProfile(c, [tx({ amount: 1500 }), tx({ amount: 1500, date: '2026-05-20' })]));
    assert.equal(r4InflowExceedsProfile(c, [tx({ amount: 1500 }), tx({ amount: 1500, date: '2026-06-20' })]), null, 'split across months');
  });
  test('R5 detects identical postings and ignores different amounts', () => {
    const c = customer();
    assert.ok(r5DuplicatePosting(c, [tx({ reference: 'X', amount: 50 }), tx({ reference: 'X', amount: 50 })]));
    assert.equal(r5DuplicatePosting(c, [tx({ reference: 'X', amount: 50 }), tx({ reference: 'X', amount: 51 })]), null);
  });
  test('R6 requires ≥90% out by wire to other counterparties within 2 days', () => {
    const c = customer();
    const credit = tx({ amount: 20000, counterparty: 'Payer', date: '2026-06-01' });
    assert.equal(r6RapidPassThrough(c, [credit, tx({ direction: 'debit', channel: 'wire_domestic', amount: 17000, counterparty: 'B', date: '2026-06-02' })]), null);
    assert.ok(r6RapidPassThrough(c, [credit, tx({ direction: 'debit', channel: 'wire_domestic', amount: 18000, counterparty: 'B', date: '2026-06-03' })]));
    assert.equal(r6RapidPassThrough(c, [credit, tx({ direction: 'debit', channel: 'eft', amount: 19000, counterparty: 'B', date: '2026-06-02' })]), null, 'not a wire');
  });
  test('R7 is suppressed when international payments are part of the declared purpose', () => {
    const wires = ['A', 'B', 'C'].map((cp, i) => tx({ channel: 'wire_international', counterparty: cp, date: `2026-06-0${i + 1}`, amount: 1000 }));
    assert.ok(r7ProfileInconsistency(customer(), wires));
    assert.equal(r7ProfileInconsistency(customer({ internationalExpected: true }), wires), null);
  });
});

describe('scoring', () => {
  test('bands follow documented thresholds', () => {
    assert.equal(bandFor(60), 'High');
    assert.equal(bandFor(59), 'Medium');
    assert.equal(bandFor(35), 'Medium');
    assert.equal(bandFor(34), 'Low');
  });
  test('score is the sum of rule weights and context modifiers, capped at 100', () => {
    const a = alertFor('CUS-1007');
    assert.equal(a.score, a.scoreBreakdown.reduce((s, b) => s + b.points, 0));
    const { score } = scoreAlert(customer({ riskRating: 'high', kycStatus: 'refresh_due' }), alertFor('CUS-1019').hits);
    assert.equal(score, 100);
  });
});

describe('migration defect vs. unresolved suspicious activity', () => {
  test('S5 decimal-shift alert disappears when evidence-supported corrections are applied', () => {
    const c = ds.customers.find((x) => x.customerId === 'CUS-1031')!;
    const fixed = correctedTransactions(ds, ds.transactions.filter((t) => t.customerId === c.customerId));
    assert.equal(fixed.changes.length, 1);
    assert.deepEqual(evaluateCustomer(c, fixed.txs), []);
  });
  test('S4 duplicates disappear when the load-run-2 copies are removed', () => {
    const c = ds.customers.find((x) => x.customerId === 'CUS-1024')!;
    const fixed = correctedTransactions(ds, ds.transactions.filter((t) => t.customerId === c.customerId));
    assert.equal(fixed.changes.length, 3);
    assert.deepEqual(evaluateCustomer(c, fixed.txs), []);
  });
  test('S6 cash pattern is unaffected by data corrections (no migration involvement)', () => {
    const evidence = buildEvidence(ds, alertFor('CUS-1015'));
    const re = evidence.find((e) => e.id === 'reevaluate')!;
    assert.match(re.summary, /No data corrections are supported/);
    assert.equal(evidence.find((e) => e.id === 'lineage')!.status, 'info');
  });
  test('corrections never touch live core transactions', () => {
    const { txs } = correctedTransactions(ds, ds.transactions);
    const liveBefore = ds.transactions.filter((t) => t.sourceSystem === 'CORE_LIVE');
    const liveAfter = txs.filter((t) => t.sourceSystem === 'CORE_LIVE');
    assert.deepEqual(liveAfter, liveBefore);
  });
});

describe('dispositions', () => {
  const good = { rationale: 'Reviewed the ERP cross-check and the reconciliation report; amounts differ by exactly 100x.', reviewedEvidenceIds: ['erp'], analyst: 'Visitor' };
  test('close is allowed only where documents explain every triggered rule', () => {
    assert.equal(closeEligibility(ds, alertFor('CUS-1031')).allowed, true);  // S5 defect documented
    assert.equal(closeEligibility(ds, alertFor('CUS-1024')).allowed, true);  // S4 duplicates documented
    assert.equal(closeEligibility(ds, alertFor('CUS-1003')).allowed, true);  // S8 seasonality documented
    assert.equal(closeEligibility(ds, alertFor('CUS-1015')).allowed, false); // S6 unresolved
    assert.equal(closeEligibility(ds, alertFor('CUS-1019')).allowed, false); // S3
    assert.equal(closeEligibility(ds, alertFor('CUS-1012')).allowed, false); // S2 note is not documentation
  });
  test('closing an unexplained alert is rejected', () => {
    const errors = validateDisposition(ds, alertFor('CUS-1015'), { ...good, code: 'CLOSE_EXPLAINED_EXCEPTION' });
    assert.ok(errors.some((e) => e.startsWith('Closing is not supported')));
  });
  test('escalation of the unresolved case is accepted with a reasoned rationale', () => {
    assert.deepEqual(validateDisposition(ds, alertFor('CUS-1015'), { ...good, code: 'ESCALATE_TO_COMPLIANCE' }), []);
  });
  test('rationale and reviewed evidence are required', () => {
    const errors = validateDisposition(ds, alertFor('CUS-1031'), { code: 'FURTHER_INVESTIGATION', rationale: 'short', reviewedEvidenceIds: [], analyst: 'V' });
    assert.equal(errors.length, 2);
  });
  test('narrative is marked as a simulation and never asserts fraud', () => {
    const a = alertFor('CUS-1019');
    const text = buildNarrative(ds, a, buildEvidence(ds, a), { ...good, code: 'ESCALATE_TO_COMPLIANCE', caseId: a.caseId, recordedAt: '2026-07-20' }, []);
    assert.ok(text.startsWith('SIMULATION — SYNTHETIC DATA — NOT A REGULATORY REPORT'));
    assert.doesNotMatch(text, /\b(is|was|confirmed|determined to be) (fraud|money laundering)/i);
  });
});
