import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { IntegrationEnvironment, SAMPLE_REQUEST, validatePayment, idempotencyKey, payloadFingerprint } from '../src/engine/payments/payments';
import { sha256Hex } from '../src/lib/sha256';

const opts = { idempotencyEnabled: true, maxAttempts: 4, baseDelayMs: 500 };

describe('sha256', () => {
  test('matches the FIPS 180-4 test vectors', () => {
    assert.equal(sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    assert.equal(sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

describe('schema validation', () => {
  test('accepts the sample request', () => assert.deepEqual(validatePayment(SAMPLE_REQUEST, '2026-07-20'), []));
  test('reports each invalid field', () => {
    const bad = { ...SAMPLE_REQUEST, amount: 10.123, currency: 'EUR', creditorInstitution: '12345', valueDate: '2026-07-01', extra: true };
    const fields = validatePayment(bad, '2026-07-20').map((e) => e.field).sort();
    assert.deepEqual(fields, ['amount', 'creditorInstitution', 'currency', 'extra', 'valueDate']);
  });
  test('rejects non-objects and missing fields', () => {
    assert.equal(validatePayment('x', '2026-07-20')[0].field, '(body)');
    assert.ok(validatePayment({}, '2026-07-20').length >= 9);
  });
  test('invalid requests never reach the bank', () => {
    const env = new IntegrationEnvironment();
    const r = env.submit({ ...SAMPLE_REQUEST, amount: -5 }, opts);
    assert.equal(r.final, 'VALIDATION_FAILED');
    assert.equal(env.bank.statement.length, 0);
  });
});

describe('idempotency', () => {
  test('key is stable per ERP document and distinct across documents', () => {
    assert.equal(idempotencyKey('AP-PMT-000418'), idempotencyKey('AP-PMT-000418'));
    assert.notEqual(idempotencyKey('AP-PMT-000418'), idempotencyKey('AP-PMT-000419'));
  });
  test('fingerprint ignores key order', () => {
    const reordered = Object.fromEntries(Object.entries(SAMPLE_REQUEST).reverse()) as typeof SAMPLE_REQUEST;
    assert.equal(payloadFingerprint(reordered), payloadFingerprint(SAMPLE_REQUEST));
  });
  test('duplicate submission is replayed, not paid twice', () => {
    const env = new IntegrationEnvironment();
    const a = env.submit(SAMPLE_REQUEST, opts);
    const b = env.submit(SAMPLE_REQUEST, opts);
    assert.equal(a.final, 'CONFIRMED');
    assert.equal(b.final, 'CONFIRMED');
    assert.equal(b.attempts[0].replayed, true);
    assert.equal(env.bank.statement.length, 1);
    assert.equal(env.reconcile()[0].result, 'MATCHED');
  });
  test('same key with a changed payload is a 409 conflict', () => {
    const env = new IntegrationEnvironment();
    env.submit(SAMPLE_REQUEST, opts);
    const r = env.submit({ ...SAMPLE_REQUEST, amount: 18350.4 }, opts);
    assert.equal(r.final, 'CONFLICT');
    assert.equal(env.bank.statement.length, 1);
  });
});

describe('retries and error paths', () => {
  test('transient 503s are retried with growing back-off, then succeed', () => {
    const env = new IntegrationEnvironment();
    env.bank.setFault('transient_503', 2);
    const r = env.submit(SAMPLE_REQUEST, opts);
    assert.deepEqual(r.attempts.map((a) => a.status), [503, 503, 201]);
    assert.ok(r.attempts[2].waitBeforeMs > r.attempts[1].waitBeforeMs);
    assert.equal(r.final, 'CONFIRMED');
  });
  test('422 insufficient funds is not retried', () => {
    const env = new IntegrationEnvironment();
    env.bank.setFault('insufficient_funds');
    const r = env.submit(SAMPLE_REQUEST, opts);
    assert.equal(r.attempts.length, 1);
    assert.equal(r.final, 'REJECTED');
    assert.equal(env.erp.get(SAMPLE_REQUEST.erpPaymentRef)!.status, 'REJECTED');
  });
  test('retries stop at maxAttempts and leave the ERP record for review', () => {
    const env = new IntegrationEnvironment();
    env.bank.setFault('transient_503', 10);
    const r = env.submit(SAMPLE_REQUEST, { ...opts, maxAttempts: 3 });
    assert.equal(r.attempts.length, 3);
    assert.equal(r.final, 'NEEDS_REVIEW');
  });
  test('timeout after commit + idempotent retry = exactly one debit', () => {
    const env = new IntegrationEnvironment();
    env.bank.setFault('timeout_after_commit', 1);
    const r = env.submit(SAMPLE_REQUEST, opts);
    assert.deepEqual(r.attempts.map((a) => a.status), ['TIMEOUT', 201]);
    assert.equal(r.attempts[1].replayed, true);
    assert.equal(env.bank.statement.length, 1);
    assert.equal(env.reconcile()[0].result, 'MATCHED');
  });
  test('timeout after commit WITHOUT idempotency produces a duplicate payment that reconciliation catches', () => {
    const env = new IntegrationEnvironment();
    env.bank.setFault('timeout_after_commit', 1);
    env.submit(SAMPLE_REQUEST, { ...opts, idempotencyEnabled: false });
    assert.equal(env.bank.statement.length, 2);
    assert.equal(env.reconcile()[0].result, 'DUPLICATE_PAYMENT');
  });
  test('audit trail never contains full account numbers or the bearer token', () => {
    const env = new IntegrationEnvironment();
    env.submit(SAMPLE_REQUEST, opts);
    const text = JSON.stringify(env.audit) + JSON.stringify(env.bank.statement);
    assert.ok(!text.includes(SAMPLE_REQUEST.creditorAccount));
    assert.ok(!text.includes(env.bank.MOCK_TOKEN));
  });
});
