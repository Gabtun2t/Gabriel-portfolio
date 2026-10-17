import { useMemo, useRef, useState } from 'react';
import { LabBrief } from '../components/LabBrief';
import { IntegrationEnvironment, PAYMENT_SCHEMA, SAMPLE_REQUEST, type FaultMode, type RunResult } from '../engine/payments/payments';
import { Badge, CodeBlock, SimBanner, extractBlock } from '../components/ui';
import { Diagram } from '../components/Diagram';
import { money } from '../lib/format';
import paymentsSrc from '../engine/payments/payments.ts?raw';

interface Step { label: string; request: unknown; fault: FaultMode; budget: number; idempotency: boolean }
interface Preset { id: string; name: string; teaches: string; steps: Step[] }

const pretty = (v: unknown) => JSON.stringify(v, null, 2);
const base = SAMPLE_REQUEST;

const PRESETS: Preset[] = [
  { id: 'happy', name: 'Happy path', teaches: 'Validation → key → 201 → ERP confirmed → bank line reconciles.', steps: [{ label: 'Send', request: base, fault: 'none', budget: 0, idempotency: true }] },
  { id: 'invalid', name: 'Invalid request (schema)', teaches: 'Bad data is rejected before any call to the bank.', steps: [{ label: 'Send', request: { ...base, amount: 18250.405, currency: 'EUR', creditorInstitution: '4-12345', valueDate: '2026-07-01' }, fault: 'none', budget: 0, idempotency: true }] },
  { id: 'dup', name: 'Duplicate submission', teaches: 'The same ERP document sent twice is replayed by the bank, not paid twice.', steps: [{ label: 'Send', request: base, fault: 'none', budget: 0, idempotency: true }, { label: 'Send again (user double-click / batch re-run)', request: base, fault: 'none', budget: 0, idempotency: true }] },
  { id: '503', name: 'Bank 503 twice, then success', teaches: 'Transient errors are retried with exponential back-off and jitter.', steps: [{ label: 'Send', request: base, fault: 'transient_503', budget: 2, idempotency: true }] },
  { id: '429', name: 'Rate limited (429), then success', teaches: '429 is retryable; the client backs off instead of hammering the API.', steps: [{ label: 'Send', request: base, fault: 'rate_limit_429', budget: 1, idempotency: true }] },
  { id: 'timeout', name: 'Timeout after bank commit', teaches: 'The bank debited the account but the response was lost. The retry carries the same key, so the bank returns the original result.', steps: [{ label: 'Send', request: base, fault: 'timeout_after_commit', budget: 1, idempotency: true }] },
  { id: 'timeout-unsafe', name: 'Timeout after commit — idempotency OFF', teaches: 'Unsafe on purpose: without a key the retry creates a second debit. Reconciliation catches the duplicate payment.', steps: [{ label: 'Send', request: base, fault: 'timeout_after_commit', budget: 1, idempotency: false }] },
  { id: 'partial', name: 'Batch with a partial failure', teaches: 'A three-payment AP batch: the first two clear, the third exceeds the remaining balance and is rejected. Each payment is tracked on its own; the batch is not “all or nothing”, and reconciliation shows exactly which one did not move.', steps: [
    { label: 'Batch item 1 of 3', request: { ...base, erpPaymentRef: 'AP-PMT-000501', vendorId: 'V-2044', creditorName: 'Larchview Steel Fabricators (fictional)', creditorAccount: '5550099001', amount: 180000, remittanceInfo: 'INV-80110' }, fault: 'none', budget: 0, idempotency: true },
    { label: 'Batch item 2 of 3', request: { ...base, erpPaymentRef: 'AP-PMT-000502', vendorId: 'V-2051', creditorName: 'Pellmore Industrial Gases (fictional)', creditorAccount: '5550099002', amount: 240000, remittanceInfo: 'INV-80117' }, fault: 'none', budget: 0, idempotency: true },
    { label: 'Batch item 3 of 3', request: { ...base, erpPaymentRef: 'AP-PMT-000503', vendorId: 'V-2063', creditorName: 'Quarrow Freight Lines (fictional)', creditorAccount: '5550099003', amount: 150000, remittanceInfo: 'INV-80125' }, fault: 'none', budget: 0, idempotency: true },
  ] },
  { id: '422', name: 'Insufficient funds (422)', teaches: 'Business rejections are not retried; the ERP record is marked rejected and nothing moves.', steps: [{ label: 'Send', request: base, fault: 'insufficient_funds', budget: 0, idempotency: true }] },
  { id: '409', name: 'Edited after sending (409 conflict)', teaches: 'Reusing a key with a changed payload is refused: a changed payment must be a new ERP document.', steps: [{ label: 'Send original', request: base, fault: 'none', budget: 0, idempotency: true }, { label: 'Send edited amount, same document', request: { ...base, amount: 18350.4 }, fault: 'none', budget: 0, idempotency: true }] },
];

const outcomeTone = (o: string) => (o === 'CONFIRMED' ? 'green' : o === 'NEEDS_REVIEW' || o === 'CONFLICT' ? 'amber' : 'red');
const statusTone = (s: number | 'TIMEOUT') => (s === 201 ? 'green' : s === 'TIMEOUT' || s === 503 || s === 429 ? 'amber' : 'red');

export function PaymentsLab() {
  const env = useRef(new IntegrationEnvironment());
  const [, force] = useState(0);
  const [json, setJson] = useState(pretty(base));
  const [fault, setFault] = useState<FaultMode>('none');
  const [budget, setBudget] = useState(1);
  const [idem, setIdem] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState(4);
  const [runs, setRuns] = useState<{ label: string; result: RunResult }[]>([]);
  const [parseError, setParseError] = useState('');
  const [preset, setPreset] = useState<Preset | null>(null);

  const reset = () => { env.current = new IntegrationEnvironment(); setRuns([]); force((n) => n + 1); };
  const send = (label: string, request: unknown, f: FaultMode, b: number, useIdem: boolean) => {
    env.current.bank.setFault(f, b);
    const result = env.current.submit(request, { idempotencyEnabled: useIdem, maxAttempts, baseDelayMs: 500 });
    env.current.bank.setFault('none', 0);
    return { label, result };
  };
  const runPreset = (p: Preset) => {
    env.current = new IntegrationEnvironment();
    setPreset(p);
    const out = p.steps.map((s) => send(s.label, s.request, s.fault, s.budget, s.idempotency));
    const last = p.steps[p.steps.length - 1];
    setJson(pretty(last.request)); setFault(last.fault); setBudget(last.budget || 1); setIdem(last.idempotency);
    setRuns(out); setParseError(''); force((n) => n + 1);
  };
  const runManual = () => {
    let body: unknown;
    try { body = JSON.parse(json); } catch (e) { setParseError(`Request body is not valid JSON: ${(e as Error).message}`); return; }
    setParseError(''); setPreset(null);
    setRuns((r) => [...r, send(`Manual send #${r.length + 1}`, body, fault, budget, idem)]);
    force((n) => n + 1);
  };

  const e = env.current;
  const recon = e.reconcile();
  const last = runs.at(-1)?.result;

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">Lab 3</div>
          <h1>Mock bank payment API ↔ ERP integration lab</h1>
          <p className="lead">An accounts-payable payment leaves a mock ERP, passes schema validation, gets an idempotency key, and calls a local mock bank that can fail on demand. Watch retries, the audit trail and the bank-to-ERP reconciliation.</p>
          <p className="small" style={{ color: 'var(--navy-muted)' }}>Inspired by supporting a bank payment API ↔ Sage 300 integration; this is an independent teaching implementation, not a reproduction of any proprietary system.</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container stack">
          <SimBanner>No real bank, API endpoint, account or credential is used. The “bank” is an in-memory object in your browser with a simulated clock; account numbers and the token are fictional.</SimBanner>
          <PaymentsBrief />

          <div className="card">
            <h3>Scenarios</h3>
            <p className="small muted">Each scenario resets the environment and runs its steps. Then edit the request and send manually.</p>
            <div className="row" style={{ gap: 8 }}>
              {PRESETS.map((p) => <button key={p.id} className={`btn btn-sm ${preset?.id === p.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => runPreset(p)}>{p.name}</button>)}
            </div>
            {preset && <p className="small" style={{ marginTop: 10, marginBottom: 0 }}><strong>{preset.name}:</strong> {preset.teaches}</p>}
          </div>

          <div className="split">
            <div className="card stack">
              <h3 style={{ margin: 0 }}>Request builder</h3>
              <div className="field">
                <label htmlFor="pj">POST /v1/payments — body (JSON)</label>
                <textarea id="pj" className="code" value={json} onChange={(ev) => setJson(ev.target.value)} spellCheck={false} />
              </div>
              <div className="grid cols-2" style={{ gap: 10 }}>
                <div className="field">
                  <label htmlFor="fault">Bank behaviour on next send</label>
                  <select id="fault" value={fault} onChange={(ev) => setFault(ev.target.value as FaultMode)}>
                    <option value="none">Normal</option>
                    <option value="transient_503">503 Service unavailable</option>
                    <option value="rate_limit_429">429 Rate limited</option>
                    <option value="timeout_after_commit">Commit, then lose the response</option>
                    <option value="insufficient_funds">422 Insufficient funds</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="budget">Fault applies to next N calls</label>
                  <input id="budget" type="number" min={1} max={10} value={budget} onChange={(ev) => setBudget(Math.max(1, Math.min(10, Number(ev.target.value) || 1)))} />
                </div>
                <div className="field">
                  <label htmlFor="ma">Max attempts</label>
                  <input id="ma" type="number" min={1} max={6} value={maxAttempts} onChange={(ev) => setMaxAttempts(Math.max(1, Math.min(6, Number(ev.target.value) || 1)))} />
                </div>
                <label className="check" style={{ alignSelf: 'end', paddingBottom: 8 }}><input type="checkbox" checked={idem} onChange={(ev) => setIdem(ev.target.checked)} />Send Idempotency-Key header</label>
              </div>
              {!idem && <div className="callout bad"><p className="small"><strong>Unsafe mode.</strong> Retries and re-sends will be treated by the bank as new payments.</p></div>}
              {parseError && <div className="callout bad" role="alert"><p className="small">{parseError}</p></div>}
              <div className="row">
                <button className="btn btn-primary" onClick={runManual}>Send to mock bank</button>
                <button className="btn btn-secondary" onClick={() => setJson(pretty(base))}>Restore sample</button>
                <button className="btn btn-danger" onClick={reset}>Reset environment</button>
              </div>
              <details className="disclosure">
                <summary>Request schema</summary>
                <div className="body"><table className="data compact"><tbody>{PAYMENT_SCHEMA.map((s) => <tr key={s.field}><td className="mono small">{s.field}</td><td className="small muted">{s.type}</td><td className="small">{s.rule}</td></tr>)}</tbody></table></div>
              </details>
            </div>

            <div className="stack">
              <div className="card">
                <h3>Run timeline</h3>
                {!runs.length ? <div className="empty">Pick a scenario or send the sample request.</div> : runs.map(({ label, result }) => (
                  <div key={result.correlationId} className="evidence" style={{ marginTop: 10 }}>
                    <header><h4>{label} <span className="mono small muted">{result.correlationId}</span></h4><Badge tone={outcomeTone(result.final)}>{result.final.replace('_', ' ')}</Badge></header>
                    {result.validationErrors.length > 0 && <ul>{result.validationErrors.map((v) => <li key={v.field + v.message}><span className="mono">{v.field}</span> {v.message}</li>)}</ul>}
                    {result.idempotencyKey && <p className="mono small" style={{ wordBreak: 'break-all' }}>Idempotency-Key: {result.idempotencyKey}</p>}
                    {result.attempts.length > 0 && (
                      <table className="data compact" style={{ marginTop: 8 }}>
                        <thead><tr><th>Attempt</th><th className="num">Wait before</th><th>Bank response</th></tr></thead>
                        <tbody>{result.attempts.map((a) => <tr key={a.n}><td>#{a.n}</td><td className="num mono">{a.waitBeforeMs ? `${a.waitBeforeMs} ms` : '—'}</td><td><Badge tone={statusTone(a.status)}>{a.status}</Badge>{a.replayed && <> <Badge tone="blue">replayed</Badge></>}</td></tr>)}</tbody>
                      </table>
                    )}
                  </div>
                ))}
                {last?.response && (
                  <details className="disclosure" style={{ marginTop: 10 }}>
                    <summary>Last bank response</summary>
                    <div className="body"><CodeBlock lang="json" title={`HTTP ${last.response.status}`} code={pretty({ status: last.response.status, headers: last.response.headers, body: last.response.body })} /></div>
                  </details>
                )}
              </div>
              <div className="card">
                <h3>Reconciliation: ERP AP payments ↔ bank statement</h3>
                {!recon.length ? <p className="small muted">No ERP payments yet.</p> : (
                  <div className="table-wrap">
                    <table className="data compact">
                      <thead><tr><th>ERP document</th><th className="num">Amount</th><th>ERP status</th><th>Bank lines</th><th>Result</th></tr></thead>
                      <tbody>{recon.map((r) => <tr key={r.erpPaymentRef}><td className="mono small">{r.erpPaymentRef}</td><td className="num">{money(r.erpAmount)}</td><td><Badge tone={r.erpStatus === 'CONFIRMED' ? 'green' : r.erpStatus === 'REJECTED' ? 'red' : 'amber'}>{r.erpStatus}</Badge></td><td className="mono small">{r.bankLines.map((l) => l.bankTxnId).join(', ') || '—'}</td><td><Badge tone={r.result === 'MATCHED' || r.result === 'NOT_EXPECTED_AT_BANK' ? 'green' : r.result === 'PENDING_REVIEW' ? 'amber' : 'red'}>{r.result.replace(/_/g, ' ')}</Badge></td></tr>)}</tbody>
                    </table>
                  </div>
                )}
                <p className="small muted" style={{ marginTop: 8, marginBottom: 0 }}>Bank balance: {money(e.bank.balance)} · {e.bank.statement.length} debit(s) on the mock statement.</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Audit trail ({e.audit.length} events)</h3>
            {!e.audit.length ? <p className="small muted">Events appear here as requests are processed. Account numbers are masked and the token is never logged.</p> : (
              <ul className="event-list">{e.audit.map((a, i) => <li key={i}><span className="mono muted">{a.at.slice(11, 23)}</span><span><Badge tone={a.outcome === 'success' ? 'green' : a.outcome === 'error' ? 'red' : a.outcome === 'warning' ? 'amber' : 'neutral'}>{a.step}</Badge></span><span><span className="mono muted">{a.correlationId}</span> {a.detail}</span></li>)}</ul>
            )}
          </div>

          <div className="card">
            <h3>Integration architecture</h3>
            <Diagram label="Payment integration architecture: ERP AP to integration service to mock bank, with audit log, bank statement and reconciliation" width={1000} height={290}
              nodes={[
                { id: 'erp', x: 10, y: 30, w: 160, title: 'ERP accounts payable', sub: 'approved payment batch' },
                { id: 'svc', x: 270, y: 30, w: 180, title: 'Integration service', sub: 'validate · key · retry', tone: 'accent' },
                { id: 'bank', x: 560, y: 30, w: 160, title: 'Bank payment API', sub: 'mock, in-memory', tone: 'dark' },
                { id: 'vault', x: 830, y: 30, w: 160, title: 'Secrets vault', sub: 'token / mTLS certs' },
                { id: 'rec', x: 10, y: 190, w: 160, title: 'Reconciliation', sub: 'ERP ↔ statement', tone: 'warn' },
                { id: 'audit', x: 270, y: 190, w: 180, title: 'Audit log', sub: 'masked, correlation IDs' },
                { id: 'stmt', x: 560, y: 190, w: 160, title: 'Bank statement', sub: 'debits by end-to-end ID', tone: 'dark' },
              ]}
              edges={[
                { from: 'erp', to: 'svc', label: 'request', tone: 'accent' },
                { from: 'svc', to: 'bank', label: 'POST + key', tone: 'accent' },
                { from: 'vault', to: 'bank', fromSide: 'l', toSide: 'r', label: 'credentials' },
                { from: 'svc', to: 'audit', fromSide: 'b', toSide: 't', label: 'events' },
                { from: 'bank', to: 'stmt', fromSide: 'b', toSide: 't', label: 'debit' },
                { from: 'erp', to: 'rec', fromSide: 'b', toSide: 't', label: 'AP status' },
                { from: 'stmt', to: 'rec', fromSide: 'b', toSide: 'b', tone: 'warn', label: 'statement lines' },
              ]} />
            <div className="grid cols-2" style={{ marginTop: 14 }}>
              <div>
                <h4>Design decisions</h4>
                <ul className="small" style={{ paddingLeft: 18 }}>
                  <li><strong>Key from the ERP document</strong> (hash of AP-PMT ref), so a re-run of the AP batch reuses keys automatically. A random key per attempt would defeat idempotency.</li>
                  <li><strong>Payload fingerprint</strong> stored with the key; same key + different payload → 409, forcing edits to become new documents.</li>
                  <li><strong>Retry only 429/503/timeouts</strong>, with exponential back-off and jitter; 4xx business errors stop immediately.</li>
                  <li><strong>Unknown outcome ≠ failure.</strong> After exhausted retries the ERP record goes to NEEDS_REVIEW, never back to APPROVED — preventing a manual double payment.</li>
                  <li><strong>Reconciliation by end-to-end ID</strong> catches what the client cannot see (duplicate or missing debits).</li>
                </ul>
              </div>
              <div>
                <h4>Security notes (production design, not implemented in the mock)</h4>
                <ul className="small" style={{ paddingLeft: 18 }}>
                  <li>Mutual TLS and OAuth 2.0 client-credentials with short-lived tokens; secrets in a vault, never in code, config files or the browser.</li>
                  <li>Request signing (e.g. JWS) and replay windows on the bank side; IP allow-listing for the integration host.</li>
                  <li>Least-privilege service accounts; segregation of duties between AP approval and payment release.</li>
                  <li>Mask account numbers and never log tokens (enforced by a test here); retain audit logs immutably.</li>
                  <li>Validate at both ends — client-side schema checks are for fast feedback, the bank remains authoritative.</li>
                </ul>
              </div>
            </div>
          </div>

          <details className="disclosure">
            <summary>Code: idempotency, back-off and the mock bank</summary>
            <div className="body stack">
              <CodeBlock title="idempotencyKey()" code={extractBlock(paymentsSrc, 'idempotencyKey')} />
              <CodeBlock title="validatePayment()" code={extractBlock(paymentsSrc, 'validatePayment')} maxHeight={320} />
              <CodeBlock title="class MockBank" code={extractBlock(paymentsSrc, 'MockBank')} maxHeight={420} />
            </div>
          </details>
        </div>
      </section>
    </>
  );
}

function runScenario(fault: FaultMode, idempotencyEnabled: boolean, sends: number) {
  const env = new IntegrationEnvironment();
  for (let i = 0; i < sends; i++) {
    env.bank.setFault(i === 0 ? fault : 'none', i === 0 ? 1 : 0);
    env.submit(SAMPLE_REQUEST, { idempotencyEnabled, maxAttempts: 4, baseDelayMs: 500 });
  }
  const r = env.reconcile()[0];
  return { debits: env.bank.statement.length, result: r.result, erp: r.erpStatus, paid: env.bank.statement.reduce((t, l) => t + l.amount, 0) };
}

function PaymentsBrief() {
  const rows = useMemo(() => [
    { scenario: 'Bank commits, response lost (timeout after commit)', fault: 'timeout_after_commit' as FaultMode, sends: 1 },
    { scenario: 'Same payment submitted twice (double-click or batch re-run)', fault: 'none' as FaultMode, sends: 2 },
  ].map((r) => ({ ...r, safe: runScenario(r.fault, true, r.sends), unsafe: runScenario(r.fault, false, r.sends) })), []);
  const t = rows[0];
  return (
    <>
      <LabBrief
        problem="An ERP sends supplier payments to a bank API. Networks fail, banks return errors, and sometimes the bank processes a payment but the response never arrives."
        why="A naive retry pays the supplier twice; a naive “failed” status invites someone to resend it by hand. Either way money leaves the company that should not, and the ERP no longer matches the bank."
        proves="That Gabriel can design a payment integration that is safe to retry: schema validation before any call, idempotency keys tied to the ERP document, retry only on transient errors, visible unknown outcomes, an audit trail, and reconciliation that catches what the client cannot see."
        capabilities={['Request schema validation', 'Idempotency keys and replay detection', 'Payload-conflict handling (409)', 'Retries with exponential back-off and jitter', 'Partial-failure handling across a batch', 'Masked audit trail and ERP ↔ bank reconciliation']}
        findings={[
          <>Timeout after commit with idempotency: {t.safe.debits} debit, reconciliation {t.safe.result.replace(/_/g, ' ')}.</>,
          <>The same failure without idempotency: {t.unsafe.debits} debits ({money(t.unsafe.paid)} paid for a {money(SAMPLE_REQUEST.amount)} invoice), reconciliation {t.unsafe.result.replace(/_/g, ' ')}.</>,
          <>Business rejections (422) are never retried, and exhausted retries leave the ERP record in NEEDS_REVIEW rather than back to APPROVED.</>,
        ]}
        limitations={['In-memory mock bank with a simulated clock', 'No real network, persistence or concurrency', 'No status-inquiry endpoint or webhooks', 'Security controls described, not implemented']}
        technical={<p>The client (<span className="mono">IntegrationEnvironment.submit</span>) derives the key as a SHA-256 hash of the ERP payment reference, so restarts and batch re-runs reuse it. The mock bank stores the original response with a canonical-JSON payload fingerprint: same key and same payload replays, same key and different payload returns 409. Retries apply only to 429, 503 and timeouts. All behaviour is covered by <span className="mono">tests/payments.test.ts</span>.</p>}
      />
      <div className="card">
        <div className="row between"><h3 style={{ margin: 0 }}>Correct vs. incorrect integration behaviour</h3><span className="badge badge-sim">Simulation</span></div>
        <p className="small muted">Computed by running each scenario twice against a fresh mock bank: once with idempotency keys, once without.</p>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Scenario</th><th>With idempotency keys</th><th>Without (unsafe)</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.scenario}>
                  <td>{r.scenario}</td>
                  <td><Badge tone="green">{r.safe.debits} debit</Badge> <span className="small">ERP {r.safe.erp} · {r.safe.result.replace(/_/g, ' ')}</span></td>
                  <td><Badge tone="red">{r.unsafe.debits} debits</Badge> <span className="small">ERP {r.unsafe.erp} · {r.unsafe.result.replace(/_/g, ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
