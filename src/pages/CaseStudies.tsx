import type { ReactNode } from 'react';
import { Link } from '../router';
import { aml, recon, pipeline } from '../data/instances';
import { buildEvidence } from '../engine/aml/alerts';
import { reconcile } from '../engine/recon/match';
import { applyAll } from '../engine/recon/corrections';
import { runPipeline } from '../engine/pipeline/pipeline';
import { IntegrationEnvironment, SAMPLE_REQUEST } from '../engine/payments/payments';
import { CodeBlock, SimBanner, extractBlock } from '../components/ui';
import { SqlPanel } from '../components/SqlPanel';
import { money } from '../lib/format';
import rulesSrc from '../engine/aml/rules.ts?raw';

interface Study { id: string; title: string; lab: string; sections: { h: string; body: ReactNode }[] }

function compute() {
  const { ds, alerts } = aml();
  const s5 = alerts.find((a) => a.customerId === 'CUS-1031')!;
  const s6 = alerts.find((a) => a.customerId === 'CUS-1015')!;
  const ev5 = buildEvidence(ds, s5).find((e) => e.id === 'reevaluate')!;
  const ev6 = buildEvidence(ds, s6).find((e) => e.id === 'reevaluate')!;
  const r = recon();
  const base = reconcile(r.source, r.target, r.staging);
  const fixed = applyAll(base.results, r.source, r.target);
  const after = reconcile(r.source, fixed.target, r.staging);
  const p = runPipeline(pipeline().raw);
  const safe = new IntegrationEnvironment(); safe.bank.setFault('timeout_after_commit', 1); safe.submit(SAMPLE_REQUEST, { idempotencyEnabled: true, maxAttempts: 4, baseDelayMs: 500 });
  const unsafe = new IntegrationEnvironment(); unsafe.bank.setFault('timeout_after_commit', 1); unsafe.submit(SAMPLE_REQUEST, { idempotencyEnabled: false, maxAttempts: 4, baseDelayMs: 500 });
  return { ds, alerts, s5, s6, ev5, ev6, base, after, fixed, p, safe, unsafe };
}

export function CaseStudies() {
  const c = compute();
  const studies: Study[] = [
    {
      id: 'aml', title: 'Suspicious activity or data defect? Two alerts, two outcomes', lab: '/labs/aml',
      sections: [
        { h: 'Problem', body: <p>Transaction monitoring reads from a ledger that was partly migrated from a legacy system. Migration defects can look exactly like risk indicators — a sudden seven-figure receipt, or the same payment twice. An investigator has to separate the two using evidence, without assuming that every anomaly is benign or that every anomaly is suspicious.</p> },
        { h: 'Synthetic scenario', body: <p>Fictional lender Harbourline Community Finance, {c.ds.customers.length} customers, {c.ds.transactions.length.toLocaleString('en-CA')} transactions (Apr–Jun 2026). April–May history was loaded by batches MIG-0611/0612; June comes from the live core. Eight scenarios are injected (S1–S8). This study compares <Link to="/labs/aml" query={{ tab: 'case', case: c.s5.caseId }}>{c.s5.caseId}</Link> (S5, decimal-scale defect) with <Link to="/labs/aml" query={{ tab: 'case', case: c.s6.caseId }}>{c.s6.caseId}</Link> (S6, repeated cash just below $10,000).</p> },
        { h: 'Assumptions', body: <ul><li>The legacy extract and the source ERP document are the systems of record for migrated amounts.</li><li>Customer profiles (declared turnover, purpose) were current at the last KYC review.</li><li>Rule thresholds are illustrative; they are not calibrated on real data or on any regulator’s guidance.</li></ul> },
        { h: 'Data model', body: <p><span className="mono">customer</span> (profile, KYC status, product/channel risk factors) 1—* <span className="mono">txn</span> (amount, direction, channel, counterparty, <strong>source_system, migration_batch, load_run</strong>) and <span className="mono">erp_document</span> (source amount by reference). The lineage columns on <span className="mono">txn</span> are what make the defect visible. See the <Link to="/data-dictionary">data dictionary</Link>.</p> },
        { h: 'Methodology', body: <ol><li>Seven deterministic rules generate hits with observed value, threshold and transaction IDs.</li><li>Hits are grouped per customer into an alert; score = rule weights + KYC/risk modifiers (orders the queue only).</li><li>Eight evidence checks run per alert, including lineage, duplicate check and source-ERP cross-check.</li><li>A re-evaluation applies only <em>evidence-supported</em> corrections (drop load-run-2 duplicates in a batch with a logged duplicate defect; replace migrated amounts with the source document) and re-runs the rules. Live core data is never altered.</li><li>Closing as an explained exception is only allowed when documents on file explain every triggered rule.</li></ol> },
        { h: 'SQL / logic', body: <><CodeBlock title="rules.ts · r2LargeVsProfile()" code={extractBlock(rulesSrc, 'r2LargeVsProfile')} /><div style={{ marginTop: 12 }}><SqlPanel file="aml_rules.sql" only={['erp_cross_check', 'r3_cash_below_threshold']} /></div></> },
        { h: 'Findings (computed live)', body: <ul><li><strong>{c.s5.caseId}</strong>: {c.ev5.summary} {c.ev5.details.join(' ')}</li><li><strong>{c.s6.caseId}</strong>: {c.ev6.summary} All alerted rows come from the live core; the request for information is unanswered; closure is blocked and escalation to compliance is supported.</li><li>The same rule (R2, R4) fires for both. The difference is in lineage and corroborating evidence, not in the alert.</li></ul> },
        { h: 'Limitations', body: <ul><li>Rules are single-customer; no network/link analysis, sanctions or adverse-media screening.</li><li>A real investigation also considers history beyond 90 days, related parties and channel-specific context.</li><li>The simulation never decides; dispositions are the visitor’s, and reporting decisions belong to a compliance function.</li></ul> },
        { h: 'Technical trade-offs', body: <ul><li><strong>Deterministic rules vs. ML scoring:</strong> rules are explainable and testable line by line, at the cost of more false positives — appropriate for a teaching tool and for audit defensibility.</li><li><strong>Customer-level alerts</strong> reduce queue noise compared with per-transaction alerts, but can hide which rule matters most; the UI shows each hit separately for that reason.</li><li><strong>Correcting data in the investigation view</strong> is only a what-if: fixing the ledger itself belongs to the reconciliation and data-correction process.</li></ul> },
      ],
    },
    {
      id: 'recon', title: 'Reconciling a migrated ledger and tracing root causes', lab: '/labs/reconciliation',
      sections: [
        { h: 'Problem', body: <p>After a migration, row counts and totals rarely tie out. Finance needs to know which differences exist, why they happened and how to correct them — with an audit trail — before sign-off.</p> },
        { h: 'Synthetic scenario', body: <p>{recon().source.length} legacy rows vs. {recon().target.length} ERP entries for May 2026, with seeded missing rows, duplicate imports, corrupted references, wrong GL mappings, amount and date differences, and two manual journals with no source.</p> },
        { h: 'Assumptions', body: <ul><li>The legacy extract is the source of truth; the ERP is corrected towards it.</li><li>Matching uses business keys (customer + reference), not lineage keys, which often do not survive migrations.</li><li>±3 days is an acceptable posting-date tolerance; amounts must agree to the cent.</li></ul> },
        { h: 'Data model', body: <p><span className="mono">legacy_extract</span> → <span className="mono">staging_log</span> (mapping version, load status, reject reason, load runs) → <span className="mono">erp_gl_entry</span> (GL account, batch, load run, status) with <span className="mono">gl_mapping</span> (segment → GL account).</p> },
        { h: 'Methodology', body: <ol><li>Normalize references (M0); key match (M1) ranked by amount gap, date gap, load run; fuzzy match for leftovers (M2).</li><li>Identify duplicates among key-matched candidates (M3).</li><li>Classify each pair, first failing check wins (M4); report unpaired rows on both sides (M5).</li><li>Infer root causes from value patterns (×100 ratio, divisible-by-9 differences, U+FFFD characters, day/month swaps) and lineage (rejected staging rows, load runs, mapping versions).</li><li>Apply proposed corrections to a <em>new</em> ledger version with a journal; re-run.</li></ol> },
        { h: 'SQL / logic', body: <SqlPanel file="reconciliation.sql" /> },
        { h: 'Findings (computed live)', body: <ul><li>Baseline: {c.base.summary.byStatus.MATCHED} matched, {c.base.summary.total - c.base.summary.byStatus.MATCHED} exceptions; net difference {money(c.base.summary.netDifference)}.</li><li>After {c.fixed.journal.length} corrections: {c.after.summary.byStatus.MATCHED} of {recon().source.length} source rows matched; {c.after.summary.byStatus.UNMATCHED_IN_TARGET} manual journals remain for finance review — they have no source and cannot be auto-explained.</li><li>The SQL implementation returns exactly the same result rows as the TypeScript matcher (checked by <span className="mono">scripts/check_sql.py</span>).</li></ul> },
        { h: 'Limitations', body: <ul><li>One-to-one and one-to-many (duplicates) only; no many-to-one aggregation (e.g. one deposit split across several entries).</li><li>Fuzzy matching is deliberately narrow; looser rules would find more pairs but risk false matches.</li><li>Corrections are simulated; in an ERP they would be reversing and adjusting journal entries under approval workflow.</li></ul> },
        { h: 'Technical trade-offs', body: <ul><li><strong>First-failing-check classification</strong> keeps one status per pair (easy to report) but hides secondary issues; notes carry the rest.</li><li><strong>TypeScript + SQL in parallel</strong> doubles the implementation but gives a cross-check: two independent implementations agreeing is strong evidence the rules do what they say.</li></ul> },
      ],
    },
    {
      id: 'payments', title: 'Making a bank payment integration safe to retry', lab: '/labs/payments',
      sections: [
        { h: 'Problem', body: <p>Networks fail after the bank has already processed a payment. A naive retry pays the supplier twice; a naive “mark as failed” invites someone to resend manually. The integration must be safe to retry and must surface unknown outcomes.</p> },
        { h: 'Synthetic scenario', body: <p>An AP payment (fictional vendor) is sent to an in-memory mock bank that can return 503/429/422, or commit and lose the response. The mock ERP tracks AP payment status; a statement feed is reconciled by end-to-end ID.</p> },
        { h: 'Assumptions', body: <ul><li>The bank honours an Idempotency-Key header and stores the original response with a payload fingerprint.</li><li>One ERP payment document = one logical payment.</li></ul> },
        { h: 'Data model', body: <p>ERP <span className="mono">ap_payment</span> (ref, vendor, amount, status, bank_payment_id) · bank <span className="mono">payments</span> keyed by idempotency key · bank <span className="mono">statement</span> lines (bank txn ID, end-to-end ID, amount) · <span className="mono">audit_event</span> (time, correlation ID, step, outcome, masked detail).</p> },
        { h: 'Methodology', body: <ol><li>Validate the request schema before any network call.</li><li>Derive the key from the ERP document reference; fingerprint the canonical payload.</li><li>Retry only 429/503/timeouts with exponential back-off and jitter, up to a limit.</li><li>Map outcomes to ERP status, including NEEDS_REVIEW for unknown outcomes.</li><li>Reconcile ERP payments with the bank statement.</li></ol> },
        { h: 'SQL / logic', body: <CodeBlock title="Reconciliation rule (pseudo-SQL)" lang="sql" code={`SELECT p.erp_payment_ref,\n       COUNT(s.bank_txn_id) AS debits,\n       CASE WHEN COUNT(s.bank_txn_id) > 1 THEN 'DUPLICATE_PAYMENT'\n            WHEN COUNT(s.bank_txn_id) = 1 AND ABS(MAX(s.amount) - p.amount) > 0.005 THEN 'AMOUNT_MISMATCH'\n            WHEN p.status = 'NEEDS_REVIEW' THEN 'PENDING_REVIEW'\n            WHEN COUNT(s.bank_txn_id) = 1 THEN 'MATCHED'\n            WHEN p.status = 'CONFIRMED' THEN 'MISSING_AT_BANK'\n            ELSE 'NOT_EXPECTED_AT_BANK' END AS result\nFROM ap_payment p\nLEFT JOIN bank_statement s ON s.end_to_end_id = p.erp_payment_ref\nGROUP BY p.erp_payment_ref;`} /> },
        { h: 'Findings (computed live)', body: <ul><li>Timeout after commit <strong>with</strong> idempotency: {c.safe.bank.statement.length} debit, reconciliation {c.safe.reconcile()[0].result}.</li><li>Same failure <strong>without</strong> idempotency: {c.unsafe.bank.statement.length} debits, reconciliation {c.unsafe.reconcile()[0].result}.</li></ul> },
        { h: 'Limitations', body: <ul><li>Single-process, in-memory mock with a simulated clock; no real concurrency, persistence or network.</li><li>No status-inquiry endpoint, webhook handling or cut-off/value-date logic.</li><li>Security controls are described, not implemented.</li></ul> },
        { h: 'Technical trade-offs', body: <ul><li><strong>Deterministic key from the ERP document</strong> vs. random UUID per request: deterministic keys survive process restarts and batch re-runs; the cost is that a legitimately changed payment must be a new document (enforced by the 409).</li><li><strong>Client-side validation</strong> gives fast feedback but is duplicated at the bank, which remains authoritative.</li></ul> },
      ],
    },
    {
      id: 'data', title: 'A small, honest financial data pipeline', lab: '/labs/data',
      sections: [
        { h: 'Problem', body: <p>Payment data arrives from systems that disagree on date formats, units and identifiers, and sometimes sends the same file twice. Dashboards built straight on that data are wrong in ways nobody notices.</p> },
        { h: 'Synthetic scenario', body: <p>{pipeline().raw.length} raw deliveries from a card settlement file, an EFT feed (amounts in cents, CAD/USD) and an ERP AR export (DD/MM/YYYY), with 26 seeded problems.</p> },
        { h: 'Assumptions', body: <ul><li>Fixed monthly FX rates (illustrative) convert USD to CAD.</li><li>For corrected re-issues of a document, the latest delivery is authoritative.</li></ul> },
        { h: 'Data model', body: <p>Star schema: <span className="mono">fact_payment</span> (amount_original, fx_rate, amount_cad, natural_key, lineage_raw_ids) with <span className="mono">dim_customer</span>, <span className="mono">dim_date</span>, <span className="mono">dim_channel</span> and <span className="mono">ref_fx_rate</span>.</p> },
        { h: 'Methodology', body: <ol><li>Standardize each source to one canonical record.</li><li>Validate (completeness, validity, integrity) and quarantine failures with reasons.</li><li>Deduplicate exact re-deliveries, then natural-key versions (latest wins); keep all raw IDs in lineage.</li><li>Convert currency, conform dimensions, load facts; compute metrics and DQ dimensions.</li></ol> },
        { h: 'SQL / logic', body: <SqlPanel file="pipeline_model.sql" /> },
        { h: 'Findings (computed live)', body: <ul><li>{c.p.counts.map((x) => `${x.stage} ${x.rows}`).join(' → ')}.</li><li>{c.p.quarantined.length} rows quarantined; {c.p.dedup.exactDuplicates.length + c.p.dedup.keyDuplicates.length} duplicates removed; total volume {money(c.p.metrics.totalCad)}.</li><li>Turning off the currency rule lets three rows through without a CAD amount — the dashboard total does not change, which is exactly why it needs its own metric.</li></ul> },
        { h: 'Limitations', body: <ul><li>Batch, in-memory, single run; no incremental loads, late-arriving data or slowly changing dimensions.</li><li>FX rates are fixed per month rather than daily.</li></ul> },
        { h: 'Technical trade-offs', body: <ul><li><strong>Quarantine vs. drop:</strong> quarantining keeps failed rows inspectable and re-processable.</li><li><strong>Measure DQ independently of the rule configuration</strong> so a disabled rule cannot make quality look better.</li><li><strong>Pure functions per stage</strong> make each step testable and the run reproducible, at the cost of re-computing everything on change — fine at this scale.</li></ul> },
      ],
    },
  ];

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">Case studies</div>
          <h1>Technical case studies</h1>
          <p className="lead">Problem, scenario, assumptions, data model, methodology, SQL/logic, findings, limitations and trade-offs for each lab. Findings are computed live from the same engines the labs use.</p>
          <div className="row">{studies.map((s) => <a key={s.id} href={`#/case-studies`} onClick={(e) => { e.preventDefault(); document.getElementById(`cs-${s.id}`)?.scrollIntoView({ behavior: 'smooth' }); }} className="btn btn-secondary btn-sm">{s.title.split(':')[0].split('—')[0]}</a>)}</div>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container stack">
          <SimBanner>Case studies describe portfolio simulations on synthetic data. They are not accounts of client engagements.</SimBanner>
          {studies.map((s, i) => (
            <article key={s.id} id={`cs-${s.id}`} className="card" style={{ scrollMarginTop: 80 }}>
              <div className="eyebrow">Case study {i + 1}</div>
              <h2>{s.title}</h2>
              <div className="stack">
                {s.sections.map((sec) => (
                  <div key={sec.h}>
                    <h3 style={{ fontSize: 16 }}>{sec.h}</h3>
                    <div className="small" style={{ lineHeight: 1.65 }}>{sec.body}</div>
                  </div>
                ))}
              </div>
              <Link to={s.lab} className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>Open the lab</Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
