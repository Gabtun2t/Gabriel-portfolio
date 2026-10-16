/**
 * Mock bank payment API ↔ ERP accounts-payable integration (fully local simulation).
 *
 * Nothing here talks to a real bank. The "bank" is an in-memory object with configurable
 * faults; the clock is simulated so retries and back-off are deterministic and testable.
 * Inspired by experience supporting a bank-payment-API ↔ Sage 300 integration, but it is
 * an independent teaching implementation, not a reproduction of any proprietary system.
 */
import { canonicalJson, sha256Hex } from '../../lib/sha256';
import { createRng } from '../../lib/prng';
import { maskAccount } from '../../lib/format';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
export interface PaymentRequest {
  erpPaymentRef: string;
  vendorId: string;
  debtorAccount: string;
  creditorName: string;
  creditorAccount: string;
  creditorInstitution: string;
  amount: number;
  currency: string;
  valueDate: string;
  remittanceInfo: string;
}

export const PAYMENT_SCHEMA: { field: keyof PaymentRequest; type: string; rule: string }[] = [
  { field: 'erpPaymentRef', type: 'string', rule: 'Required. Pattern AP-PMT-NNNNNN (ERP AP payment document). Also the end-to-end ID.' },
  { field: 'vendorId', type: 'string', rule: 'Required. Pattern V-NNNN; must exist in the ERP vendor master.' },
  { field: 'debtorAccount', type: 'string', rule: 'Required. 7–12 digits (company operating account).' },
  { field: 'creditorName', type: 'string', rule: 'Required. 2–70 characters.' },
  { field: 'creditorAccount', type: 'string', rule: 'Required. 7–12 digits.' },
  { field: 'creditorInstitution', type: 'string', rule: 'Required. 3-digit institution + 5-digit transit, e.g. 001-12345.' },
  { field: 'amount', type: 'number', rule: 'Required. > 0, at most 2 decimals, ≤ 250,000.00 per payment.' },
  { field: 'currency', type: 'string', rule: 'Required. CAD or USD.' },
  { field: 'valueDate', type: 'string', rule: 'Required. ISO date (YYYY-MM-DD), not before the business date.' },
  { field: 'remittanceInfo', type: 'string', rule: 'Optional. ≤ 140 characters, no line breaks.' },
];

export interface ValidationError { field: string; message: string }

export function validatePayment(input: unknown, businessDate: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return [{ field: '(body)', message: 'Body must be a JSON object.' }];
  const r = input as Record<string, unknown>;
  const str = (f: string) => typeof r[f] === 'string' ? (r[f] as string) : null;
  const need = (f: string, test: (v: string) => boolean, msg: string) => {
    const v = str(f);
    if (v === null) errors.push({ field: f, message: r[f] === undefined ? 'is required.' : 'must be a string.' });
    else if (!test(v)) errors.push({ field: f, message: msg });
  };
  need('erpPaymentRef', (v) => /^AP-PMT-\d{6}$/.test(v), 'must match AP-PMT-NNNNNN.');
  need('vendorId', (v) => /^V-\d{4}$/.test(v), 'must match V-NNNN.');
  need('debtorAccount', (v) => /^\d{7,12}$/.test(v), 'must be 7–12 digits.');
  need('creditorName', (v) => v.trim().length >= 2 && v.length <= 70, 'must be 2–70 characters.');
  need('creditorAccount', (v) => /^\d{7,12}$/.test(v), 'must be 7–12 digits.');
  need('creditorInstitution', (v) => /^\d{3}-\d{5}$/.test(v), 'must look like 001-12345 (institution-transit).');
  if (typeof r.amount !== 'number' || !Number.isFinite(r.amount)) errors.push({ field: 'amount', message: r.amount === undefined ? 'is required.' : 'must be a number.' });
  else if (r.amount <= 0) errors.push({ field: 'amount', message: 'must be greater than 0.' });
  else if (Math.round(r.amount * 100) / 100 !== r.amount) errors.push({ field: 'amount', message: 'must have at most 2 decimals.' });
  else if (r.amount > 250_000) errors.push({ field: 'amount', message: 'exceeds the 250,000.00 per-payment limit.' });
  need('currency', (v) => v === 'CAD' || v === 'USD', 'must be CAD or USD.');
  need('valueDate', (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)), 'must be an ISO date YYYY-MM-DD.');
  const vd = str('valueDate');
  if (vd && /^\d{4}-\d{2}-\d{2}$/.test(vd) && vd < businessDate) errors.push({ field: 'valueDate', message: `cannot be before the business date ${businessDate}.` });
  if (r.remittanceInfo !== undefined && (typeof r.remittanceInfo !== 'string' || r.remittanceInfo.length > 140 || /[\r\n]/.test(r.remittanceInfo))) {
    errors.push({ field: 'remittanceInfo', message: 'must be a single-line string of at most 140 characters.' });
  }
  const known = new Set(PAYMENT_SCHEMA.map((s) => s.field as string));
  for (const k of Object.keys(r)) if (!known.has(k)) errors.push({ field: k, message: 'is not an allowed field.' });
  return errors;
}

/**
 * Idempotency key = hash of the ERP payment document reference. Retries and re-submissions of
 * the *same* ERP payment therefore carry the same key; a different payment gets a different key.
 */
export function idempotencyKey(erpPaymentRef: string): string {
  return `idem_${sha256Hex(`HCF-AP|${erpPaymentRef}`).slice(0, 32)}`;
}

export function payloadFingerprint(req: PaymentRequest): string {
  return sha256Hex(canonicalJson(req)).slice(0, 16);
}

// ---------------------------------------------------------------------------
// Mock bank
// ---------------------------------------------------------------------------
export type FaultMode = 'none' | 'transient_503' | 'rate_limit_429' | 'timeout_after_commit' | 'insufficient_funds';

export interface BankResponse {
  status: number;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  /** true when the bank processed the request but the response never reached the client */
  lostResponse?: boolean;
  latencyMs: number;
}

export interface BankStatementLine {
  bankTxnId: string;
  endToEndId: string;
  valueDate: string;
  amount: number;
  creditorAccountMasked: string;
}

interface StoredPayment { fingerprint: string; response: BankResponse; }

export class MockBank {
  readonly MOCK_TOKEN = 'mock-token-not-a-secret';
  private store = new Map<string, StoredPayment>();
  statement: BankStatementLine[] = [];
  balance: number;
  private seq = 1;
  faultMode: FaultMode = 'none';
  /** How many upcoming requests the current fault affects (for transient faults). */
  faultBudget = 0;

  constructor(openingBalance = 500_000) { this.balance = openingBalance; }

  setFault(mode: FaultMode, budget = 2) { this.faultMode = mode; this.faultBudget = budget; }

  handle(headers: Record<string, string>, body: PaymentRequest, businessDate: string): BankResponse {
    const latencyMs = 120 + (this.seq % 5) * 15;
    if (headers['Authorization'] !== `Bearer ${this.MOCK_TOKEN}`) return { status: 401, headers: {}, body: { error: 'UNAUTHORIZED' }, latencyMs };
    if (this.faultMode === 'transient_503' && this.faultBudget > 0) { this.faultBudget--; return { status: 503, headers: { 'Retry-After': '1' }, body: { error: 'SERVICE_UNAVAILABLE' }, latencyMs }; }
    if (this.faultMode === 'rate_limit_429' && this.faultBudget > 0) { this.faultBudget--; return { status: 429, headers: { 'Retry-After': '2' }, body: { error: 'RATE_LIMITED' }, latencyMs }; }

    const key = headers['Idempotency-Key'];
    const fp = payloadFingerprint(body);
    if (key) {
      const prior = this.store.get(key);
      if (prior) {
        if (prior.fingerprint !== fp) return { status: 409, headers: {}, body: { error: 'IDEMPOTENCY_CONFLICT', message: 'This key was already used with a different payload.' }, latencyMs };
        return { ...prior.response, headers: { ...prior.response.headers, 'Idempotent-Replayed': 'true' }, lostResponse: false, latencyMs };
      }
    }
    const errors = validatePayment(body, businessDate);
    if (errors.length) return { status: 400, headers: {}, body: { error: 'VALIDATION_FAILED', details: errors }, latencyMs };
    if (this.faultMode === 'insufficient_funds' || body.amount > this.balance) {
      const res: BankResponse = { status: 422, headers: {}, body: { error: 'INSUFFICIENT_FUNDS', message: 'Available balance is below the payment amount.' }, latencyMs };
      if (key) this.store.set(key, { fingerprint: fp, response: res });
      return res;
    }
    // Commit
    const bankTxnId = `BNK-${String(this.seq++).padStart(6, '0')}`;
    this.balance = Math.round((this.balance - body.amount) * 100) / 100;
    this.statement.push({ bankTxnId, endToEndId: body.erpPaymentRef, valueDate: body.valueDate, amount: body.amount, creditorAccountMasked: maskAccount(body.creditorAccount) });
    const response: BankResponse = { status: 201, headers: {}, body: { paymentId: bankTxnId, status: 'ACCEPTED', endToEndId: body.erpPaymentRef }, latencyMs };
    if (key) this.store.set(key, { fingerprint: fp, response });
    if (this.faultMode === 'timeout_after_commit' && this.faultBudget > 0) {
      this.faultBudget--;
      return { ...response, lostResponse: true, latencyMs: 30_000 };
    }
    return response;
  }
}

// ---------------------------------------------------------------------------
// ERP accounts payable (mock)
// ---------------------------------------------------------------------------
export type ErpPaymentStatus = 'APPROVED' | 'SENT' | 'CONFIRMED' | 'REJECTED' | 'NEEDS_REVIEW';

export interface ErpPayment {
  erpPaymentRef: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  currency: string;
  status: ErpPaymentStatus;
  bankPaymentId: string | null;
  lastMessage: string;
}

// ---------------------------------------------------------------------------
// Integration client with retries, back-off and audit trail
// ---------------------------------------------------------------------------
export interface AuditEvent {
  at: string;
  correlationId: string;
  step: string;
  outcome: 'info' | 'success' | 'warning' | 'error';
  detail: string;
}

export interface Attempt {
  n: number;
  at: string;
  idempotencyKey: string | null;
  status: number | 'TIMEOUT';
  replayed: boolean;
  waitBeforeMs: number;
}

export interface RunOptions {
  idempotencyEnabled: boolean;
  maxAttempts: number;
  baseDelayMs: number;
}

export interface RunResult {
  correlationId: string;
  validationErrors: ValidationError[];
  attempts: Attempt[];
  final: 'CONFIRMED' | 'REJECTED' | 'VALIDATION_FAILED' | 'NEEDS_REVIEW' | 'CONFLICT';
  response: BankResponse | null;
  idempotencyKey: string | null;
}

export const RETRYABLE = new Set([429, 503]);

export class IntegrationEnvironment {
  bank = new MockBank();
  erp = new Map<string, ErpPayment>();
  audit: AuditEvent[] = [];
  private clockMs = Date.parse('2026-07-20T14:00:00.000Z');
  private runSeq = 1;
  private rng = createRng(2026);
  readonly businessDate = '2026-07-20';

  now() { return new Date(this.clockMs).toISOString(); }
  private advance(ms: number) { this.clockMs += ms; }
  private log(correlationId: string, step: string, outcome: AuditEvent['outcome'], detail: string) {
    this.audit.push({ at: this.now(), correlationId, step, outcome, detail });
  }

  ensureErpRecord(req: PaymentRequest) {
    if (!this.erp.has(req.erpPaymentRef)) {
      this.erp.set(req.erpPaymentRef, { erpPaymentRef: req.erpPaymentRef, vendorId: req.vendorId, vendorName: req.creditorName, amount: req.amount, currency: req.currency, status: 'APPROVED', bankPaymentId: null, lastMessage: 'Approved in AP payment batch' });
    }
  }

  /** Exponential back-off with deterministic jitter: base × 2^(n-1) + jitter(0–20%). */
  backoff(attempt: number, base: number): number {
    const exp = base * 2 ** (attempt - 1);
    return Math.round(exp + exp * 0.2 * this.rng.next());
  }

  submit(raw: unknown, opts: RunOptions): RunResult {
    const correlationId = `corr-${String(this.runSeq++).padStart(4, '0')}`;
    this.log(correlationId, 'receive', 'info', 'Payment request received from ERP AP payment run.');
    const validationErrors = validatePayment(raw, this.businessDate);
    if (validationErrors.length) {
      this.log(correlationId, 'validate', 'error', `Schema validation failed (${validationErrors.length} error(s)): ${validationErrors.map((e) => `${e.field} ${e.message}`).join('; ')}. Nothing sent to the bank.`);
      return { correlationId, validationErrors, attempts: [], final: 'VALIDATION_FAILED', response: null, idempotencyKey: null };
    }
    const req = raw as PaymentRequest;
    this.log(correlationId, 'validate', 'success', 'Schema validation passed.');
    this.ensureErpRecord(req);
    const erp = this.erp.get(req.erpPaymentRef)!;
    if (erp.status === 'CONFIRMED' && opts.idempotencyEnabled) {
      this.log(correlationId, 'guard', 'info', `ERP shows ${req.erpPaymentRef} already CONFIRMED (${erp.bankPaymentId}); the request is still sent with the same key to prove the bank replays rather than pays twice.`);
    }
    const key = opts.idempotencyEnabled ? idempotencyKey(req.erpPaymentRef) : null;
    this.log(correlationId, 'idempotency', key ? 'info' : 'warning', key ? `Idempotency key ${key} derived from ${req.erpPaymentRef}; payload fingerprint ${payloadFingerprint(req)}.` : 'Idempotency DISABLED (unsafe demo mode): every attempt is a new request to the bank.');
    erp.status = 'SENT';
    erp.lastMessage = 'Sent to bank';

    const attempts: Attempt[] = [];
    let response: BankResponse | null = null;
    for (let n = 1; n <= opts.maxAttempts; n++) {
      const wait = n === 1 ? 0 : this.backoff(n - 1, opts.baseDelayMs);
      if (wait) { this.advance(wait); this.log(correlationId, 'retry', 'warning', `Waiting ${wait} ms before attempt ${n} (exponential back-off with jitter).`); }
      const headers: Record<string, string> = { Authorization: `Bearer ${this.bank.MOCK_TOKEN}`, 'Content-Type': 'application/json', 'X-Correlation-Id': correlationId };
      if (key) headers['Idempotency-Key'] = key;
      const res = this.bank.handle(headers, req, this.businessDate);
      this.advance(res.latencyMs);
      const replayed = res.headers['Idempotent-Replayed'] === 'true';
      if (res.lostResponse) {
        attempts.push({ n, at: this.now(), idempotencyKey: key, status: 'TIMEOUT', replayed: false, waitBeforeMs: wait });
        this.log(correlationId, 'call', 'warning', `Attempt ${n}: no response within 30 s (timeout). The outcome at the bank is unknown.`);
        if (n === opts.maxAttempts) break;
        continue;
      }
      attempts.push({ n, at: this.now(), idempotencyKey: key, status: res.status, replayed, waitBeforeMs: wait });
      response = res;
      if (res.status === 201) {
        this.log(correlationId, 'call', 'success', `Attempt ${n}: 201 ${String(res.body.paymentId)}${replayed ? ' (replayed — bank returned the original result, no new debit)' : ''}.`);
        break;
      }
      if (RETRYABLE.has(res.status)) {
        this.log(correlationId, 'call', 'warning', `Attempt ${n}: ${res.status} ${String(res.body.error)} — retryable.`);
        continue;
      }
      this.log(correlationId, 'call', 'error', `Attempt ${n}: ${res.status} ${String(res.body.error)} — not retryable.`);
      break;
    }

    let final: RunResult['final'];
    if (response?.status === 201) {
      final = 'CONFIRMED';
      erp.status = 'CONFIRMED';
      erp.bankPaymentId = String(response.body.paymentId);
      erp.lastMessage = `Confirmed by bank ${erp.bankPaymentId}`;
      this.log(correlationId, 'erp-update', 'success', `ERP ${req.erpPaymentRef} → CONFIRMED with bank reference ${erp.bankPaymentId}.`);
    } else if (response?.status === 409) {
      final = 'CONFLICT';
      erp.status = 'NEEDS_REVIEW';
      erp.lastMessage = 'Idempotency conflict: the ERP document changed after it was sent';
      this.log(correlationId, 'erp-update', 'error', `ERP ${req.erpPaymentRef} → NEEDS_REVIEW. A changed payment must be a new ERP document, not an edit of a sent one.`);
    } else if (response && !RETRYABLE.has(response.status)) {
      final = 'REJECTED';
      erp.status = 'REJECTED';
      erp.lastMessage = `Rejected: ${String(response.body.error)}`;
      this.log(correlationId, 'erp-update', 'error', `ERP ${req.erpPaymentRef} → REJECTED (${String(response.body.error)}). AP clerk notified; no money moved.`);
    } else {
      final = 'NEEDS_REVIEW';
      erp.status = 'NEEDS_REVIEW';
      erp.lastMessage = 'Outcome unknown after retries — confirm with bank before any resend';
      this.log(correlationId, 'erp-update', 'warning', `ERP ${req.erpPaymentRef} → NEEDS_REVIEW. Retries exhausted with unknown outcome; do NOT create a new payment until reconciled.`);
    }
    return { correlationId, validationErrors: [], attempts, final, response, idempotencyKey: key };
  }

  reconcile(): { erpPaymentRef: string; erpAmount: number; erpStatus: ErpPaymentStatus; bankLines: BankStatementLine[]; result: 'MATCHED' | 'DUPLICATE_PAYMENT' | 'MISSING_AT_BANK' | 'AMOUNT_MISMATCH' | 'NOT_EXPECTED_AT_BANK' | 'PENDING_REVIEW' }[] {
    const out = [...this.erp.values()].map((p) => {
      const lines = this.bank.statement.filter((l) => l.endToEndId === p.erpPaymentRef);
      let result: ReturnType<IntegrationEnvironment['reconcile']>[number]['result'];
      if (lines.length > 1) result = 'DUPLICATE_PAYMENT';
      else if (lines.length === 1 && Math.abs(lines[0].amount - p.amount) > 0.005) result = 'AMOUNT_MISMATCH';
      else if (p.status === 'NEEDS_REVIEW') result = 'PENDING_REVIEW';
      else if (lines.length === 1) result = 'MATCHED';
      else if (p.status === 'CONFIRMED') result = 'MISSING_AT_BANK';
      else result = 'NOT_EXPECTED_AT_BANK';
      return { erpPaymentRef: p.erpPaymentRef, erpAmount: p.amount, erpStatus: p.status, bankLines: lines, result };
    });
    return out;
  }
}

export const SAMPLE_REQUEST: PaymentRequest = {
  erpPaymentRef: 'AP-PMT-000418',
  vendorId: 'V-2031',
  debtorAccount: '100200300',
  creditorName: 'Ironbridge Packaging Supply (fictional)',
  creditorAccount: '5550012345',
  creditorInstitution: '004-12345',
  amount: 18250.4,
  currency: 'CAD',
  valueDate: '2026-07-21',
  remittanceInfo: 'INV-77310 INV-77342',
};
