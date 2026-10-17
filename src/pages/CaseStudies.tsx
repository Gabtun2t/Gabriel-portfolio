import { useEffect, type ReactNode } from 'react';
import { Link, useRoute } from '../router';
import { aml, recon, pipeline } from '../data/instances';
import { buildEvidence } from '../engine/aml/alerts';
import { reconcile } from '../engine/recon/match';
import { applyAll } from '../engine/recon/corrections';
import { runPipeline, sourceControls } from '../engine/pipeline/pipeline';
import { IntegrationEnvironment, SAMPLE_REQUEST } from '../engine/payments/payments';
import { Badge, CodeBlock, extractBlock } from '../components/ui';
import { SqlPanel } from '../components/SqlPanel';
import { AI_DISCLOSURE, ERP_LIFECYCLE } from '../content/profile';
import { money, pct } from '../lib/format';
import rulesSrc from '../engine/aml/rules.ts?raw';
import paymentsSrc from '../engine/payments/payments.ts?raw';

interface Study { id: string; short: string; title: string; lab: string; real?: boolean; labLabel?: string; sections: { h: string; body: ReactNode }[] }

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
  const raw = pipeline().raw;
  const p = runPipeline(raw);
  const controls = sourceControls(p, raw);
  const opts = { maxAttempts: 4, baseDelayMs: 500 };
  const safe = new IntegrationEnvironment(); safe.bank.setFault('timeout_after_commit', 1); safe.submit(SAMPLE_REQUEST, { ...opts, idempotencyEnabled: true });
  const unsafe = new IntegrationEnvironment(); unsafe.bank.setFault('timeout_after_commit', 1); unsafe.submit(SAMPLE_REQUEST, { ...opts, idempotencyEnabled: false });
  return { ds, alerts, s5, s6, ev5, ev6, base, after, fixed, p, controls, safe, unsafe };
}

const UL = ({ items }: { items: ReactNode[] }) => <ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>;

export function CaseStudies() {
  const c = compute();
  const study = useRoute().query.get('study');
  useEffect(() => { if (study) document.getElementById(`cs-${study}`)?.scrollIntoView(); }, [study]);
  const studies: Study[] = [
    {
      id: 'erp', short: 'ERP implementation', real: true, lab: '/experience', labLabel: 'See the ERP implementation experience',
      title: 'Implementing and supporting Sage X3 and Sage 300 for client organisations',
      sections: [
        { h: 'Business context', body: <p>Client organisations moving finance and operations onto Sage X3 or Sage 300 needed the system configured to their processes, their historical data migrated and reconciled, users trained, and the system kept working after go-live: through upgrades, integrations with other applications and day-to-day issues. Client names and engagement details are confidential.</p> },
        { h: 'Gabriel’s role', body: <UL items={[<>At <strong>Softcodes International</strong> (Senior Technical Consultant, Oct 2016 – Dec 2021): delivered Sage X3 and Sage 300 implementations and advisory support across finance, manufacturing, distribution and other enterprise environments.</>, <>At <strong>Panni Management & Technology</strong> (Finance Analyst, Sage X3, Jun 2022 – Jul 2023): supported Sage X3 configuration and financial processes during ERP implementations.</>, <>At <strong>Acumatica Canada</strong> (since Jul 2023): enterprise ERP support and issue investigation. This is a support role, not implementation ownership.</>]} /> },
        { h: 'Approach across the implementation lifecycle', body: <UL items={ERP_LIFECYCLE.map((l) => <><strong>{l.stage}:</strong> {l.what} <span className="muted">({l.evidence})</span></>)} /> },
        { h: 'Systems and integrations', body: <UL items={['Sage X3 finance: General Ledger, Accounts Payable, Accounts Receivable, Fixed Assets and financial reporting.', 'Sage X3 integrations with investment and payroll applications: data mapping, interface and process issues resolved through cross-functional investigation.', 'Sage 300 bank payment API integration, delivered with an internal developer and client stakeholders, aligning payment processing with ERP and finance workflows.', 'Sage X3 V11 to V12 upgrade delivery.']} /> },
        { h: 'Testing', body: <p>Functional testing and user acceptance testing of financial transaction flows, with issues documented for resolution; migrated records validated and reconciled against source data.</p> },
        { h: 'Results', body: <p>Specific project outcomes, client counts and measures are not published. They are confidential, and the portfolio does not invent figures.</p> },
        { h: 'What this does not claim', body: <UL items={['That Gabriel led every implementation, or worked on implementations in every industry listed on the Experience page.', 'Ownership of implementations in his Acumatica support role.', 'Any client name, project count or outcome figure.']} /> },
        { h: 'How the labs relate', body: <p>The <Link to="/labs/reconciliation">reconciliation lab</Link> rebuilds, on synthetic data, the kind of source-to-target validation done during data migration. The <Link to="/labs/payments">payment lab</Link> explores the integration concerns behind a bank payment API ↔ ERP connection. Both are independent simulations, not reproductions of client systems.</p> },
      ],
    },
    {
      id: 'aml', short: 'AML investigation', title: 'Suspicious activity or data defect? Two alerts, two outcomes', lab: '/labs/aml',
      sections: [
        { h: 'Business context', body: <p>Transaction monitoring reads from a ledger that was partly migrated from a legacy system. Migration defects can look exactly like risk indicators: a sudden seven-figure receipt, or the same payment twice. An investigator has to tell them apart using evidence, without assuming that every anomaly is benign or that every anomaly is suspicious.</p> },
        { h: 'Investigation approach', body: <><p>Fictional lender Harbourline Community Finance, {c.ds.customers.length} customers and {c.ds.transactions.length.toLocaleString('en-CA')} transactions (April–June 2026), with eight injected scenarios. This study compares <Link to="/labs/aml" query={{ tab: 'case', case: c.s5.caseId }}>{c.s5.caseId}</Link> (Scenario A, decimal-scale migration defect) with <Link to="/labs/aml" query={{ tab: 'case', case: c.s6.caseId }}>{c.s6.caseId}</Link> (Scenario B, repeated cash just below $10,000).</p>
          <UL items={['Seven deterministic rules produce hits with the observed value, the threshold and the transactions involved.', 'Hits are grouped into one alert per customer; the score (rule weights plus KYC and risk modifiers) only orders the queue.', 'Eight evidence checks run per alert, including lineage, duplicates and a source-ERP cross-check.', 'A re-evaluation re-runs the rules on data corrected only where evidence supports it. Live core rows are never altered.', 'Closing as an explained exception requires documents that explain every triggered rule.']} /></> },
        { h: 'Architecture', body: <p>Seeded generator → <span className="mono">customer</span>, <span className="mono">txn</span> (with <span className="mono">source_system</span>, <span className="mono">migration_batch</span>, <span className="mono">load_run</span>) and <span className="mono">erp_document</span> → rule engine → alerts and scoring → evidence builder → disposition validator → narrative generator. Everything runs in the browser; see the <Link to="/architecture">architecture page</Link>.</p> },
        { h: 'Key design decisions', body: <UL items={[<><strong>Deterministic rules rather than a model:</strong> every hit can be explained line by line and tested; the cost is more false positives.</>, <><strong>Customer-level alerts:</strong> less queue noise than per-transaction alerts, with each rule hit still shown separately.</>, <><strong>Corrections in the investigation view are a what-if only:</strong> fixing the ledger itself belongs to the reconciliation process.</>, <><strong>Product and channel risk factors only:</strong> no demographic attribute is used anywhere, and a test enforces it.</>]} /> },
        { h: 'Testing', body: <><p>33 automated tests in <span className="mono">tests/aml.test.ts</span> cover dataset reproducibility, a clean baseline, the expected rules for each scenario, boundary tests for every rule, scoring bands, the data-defect versus unresolved-activity distinction and disposition validation. Four rules are also written in SQL and checked against SQLite. A browser test records a disposition, reloads the page and checks that it persists.</p>
          <CodeBlock title="rules.ts · r2LargeVsProfile()" code={extractBlock(rulesSrc, 'r2LargeVsProfile')} /></> },
        { h: 'Results (synthetic)', body: <UL items={[<><strong>{c.s5.caseId}:</strong> {c.ev5.summary} {c.ev5.details.join(' ')}</>, <><strong>{c.s6.caseId}:</strong> {c.ev6.summary} Every alerted row comes from the live core, the request for information is unanswered, closure is blocked and escalation is supported.</>, 'Both alerts fire the same two rules (R2 and R4). The difference lies in lineage and corroborating evidence, not in the alert.']} /> },
        { h: 'Limitations and what production would need', body: <UL items={['Calibrated thresholds and scenario tuning on real data, with model-risk governance.', 'Network and linked-account analysis, sanctions, PEP and adverse-media screening.', 'Case management with access control, maker-checker review and an immutable audit trail.', 'Regulatory reporting workflows owned by compliance. This lab stops at escalation.']} /> },
        { h: 'Professional relevance', body: <p>This relates to Gabriel’s resume experience of AML-related transaction reviews and KYC-related checks on client projects at Panni and Softcodes, escalating suspicious findings to compliance teams, and tracing some exceptions to ERP migration-related data corruption rather than fraud. The lab is a simulation; it does not describe any real case.</p> },
      ],
    },
    {
      id: 'recon', short: 'ERP reconciliation', title: 'Reconciling a migrated ledger and tracing root causes', lab: '/labs/reconciliation',
      sections: [
        { h: 'Business context', body: <p>After a migration, row counts and totals rarely tie out. Finance needs to know which differences exist, why they happened and how to correct them, with an audit trail, before sign-off.</p> },
        { h: 'Engineering approach', body: <UL items={['Normalize references (M0); match on customer and reference, ranked by amount gap, date gap and load run (M1); fuzzy-match leftovers on customer, amount and date window (M2).', 'Identify duplicates among key-matched candidates (M3); classify each pair with a first-failing-check rule (M4); report unpaired rows on both sides (M5).', 'Infer root causes from value patterns (×100 ratios, differences divisible by 9, U+FFFD characters, day/month swaps) and from lineage (rejected staging rows, load runs, mapping versions).', 'Apply proposed corrections to a new ledger version with a journal, then re-run.']} /> },
        { h: 'Architecture', body: <p><span className="mono">legacy_extract</span> → <span className="mono">staging_log</span> (mapping version, load status, reject reason, load runs) → <span className="mono">erp_gl_entry</span> (GL account, batch, load run, status), with <span className="mono">gl_mapping</span>. The matcher runs in the browser; the same logic in <span className="mono">sql/reconciliation.sql</span> runs on SQLite.</p> },
        { h: 'Key design decisions', body: <UL items={[<><strong>Business keys, not lineage keys,</strong> for pairing: lineage often does not survive a migration. Lineage is used afterwards to explain.</>, <><strong>One status per pair:</strong> easy to report, with secondary issues carried in notes.</>, <><strong>Two implementations (TypeScript and SQL):</strong> double the work, but agreement between them is strong evidence the rules do what they say.</>, <><strong>Corrections never edit the source:</strong> each produces a journal entry with before and after values.</>]} /> },
        { h: 'Testing', body: <p>13 tests in <span className="mono">tests/recon.test.ts</span> assert the count for each status, that every seeded defect lands in the right status with the right root cause, that results do not depend on lineage keys, and that corrections are predictable and non-destructive. <span className="mono">scripts/check_sql.py</span> asserts that the SQL returns exactly the same result rows.</p> },
        { h: 'Results (synthetic)', body: <><UL items={[`Initial match rate ${pct(c.base.summary.matchRate)} with ${c.base.summary.total - c.base.summary.byStatus.MATCHED} exceptions; net difference ${money(c.base.summary.netDifference)}.`, `After ${c.fixed.journal.length} corrections: final match rate ${pct(c.after.summary.matchRate)}; ${c.after.summary.byStatus.UNMATCHED_IN_TARGET} manual journals with no source remain for finance review.`]} /><SqlPanel file="reconciliation.sql" only={['summary_by_status', 'amount_mismatch_patterns', 'duplicates_by_load_run']} /></> },
        { h: 'Limitations and what production would need', body: <UL items={['Many-to-one and one-to-many aggregation (a deposit split across entries).', 'Tolerance rules agreed with finance, approval workflow and real reversing and adjusting entries.', 'Scale: partitioned, set-based matching for millions of rows.']} /> },
        { h: 'Professional relevance', body: <p>This relates to the resume: mapping, validating and reconciling migrated financial records and investigating mismatches (Panni), and leading or supporting data migration, validation and reconciliation, including a Sage X3 V11 to V12 upgrade (Softcodes).</p> },
      ],
    },
    {
      id: 'payments', short: 'Payment integration', title: 'Making a bank payment integration safe to retry', lab: '/labs/payments',
      sections: [
        { h: 'Business context', body: <p>Networks fail after the bank has already processed a payment. A naive retry pays the supplier twice; a naive “failed” status invites a manual resend. The integration must be safe to retry and must surface unknown outcomes.</p> },
        { h: 'Engineering approach', body: <UL items={['Validate the request schema before any network call.', 'Derive the idempotency key from the ERP document reference and fingerprint the canonical payload.', 'Retry only 429, 503 and timeouts, with exponential back-off and jitter, up to a limit.', 'Map every outcome to an ERP status, including NEEDS_REVIEW for unknown outcomes.', 'Reconcile ERP payments with the bank statement by end-to-end ID.']} /> },
        { h: 'Architecture', body: <p>ERP accounts payable → integration service (validation, key, retry) → mock bank API, which posts debits to a statement; the integration service writes a masked audit log; reconciliation compares ERP status with the statement. Diagram and security notes are on the <Link to="/labs/payments">lab page</Link>.</p> },
        { h: 'Key design decisions', body: <><UL items={[<><strong>Deterministic key from the ERP document, not a random UUID per request:</strong> it survives restarts and batch re-runs. The cost is that a changed payment must be a new document, which the 409 conflict enforces.</>, <><strong>Unknown outcome is not failure:</strong> the record goes to NEEDS_REVIEW, never back to APPROVED.</>, <><strong>Validate on both sides:</strong> client checks give fast feedback; the bank stays authoritative.</>]} /><CodeBlock title="idempotencyKey()" code={extractBlock(paymentsSrc, 'idempotencyKey')} /></> },
        { h: 'Testing', body: <p>17 tests in <span className="mono">tests/payments.test.ts</span>: SHA-256 test vectors, schema validation, key stability, replay, 409 conflicts, retries and back-off, non-retryable 422s, retry limits, timeout after commit with and without idempotency, a batch with a partial failure, and a check that the audit trail never contains full account numbers or the token.</p> },
        { h: 'Results (synthetic)', body: <UL items={[`Timeout after commit with idempotency: ${c.safe.bank.statement.length} debit, reconciliation ${c.safe.reconcile()[0].result.replace(/_/g, ' ')}.`, `Same failure without idempotency: ${c.unsafe.bank.statement.length} debits, reconciliation ${c.unsafe.reconcile()[0].result.replace(/_/g, ' ')}.`]} /> },
        { h: 'Limitations and what production would need', body: <UL items={['mTLS or OAuth client credentials, request signing, secrets in a vault.', 'Durable idempotency store, status-inquiry endpoint, webhooks and cut-off times.', 'Concurrency control and monitoring. The mock is single-process with a simulated clock.']} /> },
        { h: 'Professional relevance', body: <p>This relates to the resume: partnering with an internal developer and client stakeholders on a bank payment API ↔ Sage 300 integration, and aligning payment processing with ERP and finance workflows (Softcodes). The lab is an independent teaching implementation, not a reproduction of that system.</p> },
      ],
    },
    {
      id: 'data', short: 'Data engineering', title: 'A small, honest financial data pipeline', lab: '/labs/data',
      sections: [
        { h: 'Business context', body: <p>Payment data arrives from systems that disagree on date formats, units and identifiers, and sometimes the same file is sent twice. Dashboards built straight on that data are wrong in ways nobody notices.</p> },
        { h: 'Engineering approach', body: <UL items={['Standardize each source to one canonical record.', 'Validate completeness, validity and integrity; quarantine failures with reasons.', 'Deduplicate exact re-deliveries, then natural-key versions (latest wins), keeping all raw IDs in lineage.', 'Convert currency, conform dimensions and load facts; compute metrics, quality dimensions and row-count controls.']} /> },
        { h: 'Architecture', body: <p>Three raw feeds → standardize → validate (quarantine) → deduplicate → star schema (<span className="mono">fact_payment</span> with <span className="mono">dim_customer</span>, <span className="mono">dim_date</span>, <span className="mono">dim_channel</span>, <span className="mono">ref_fx_rate</span>) → metrics and dashboard.</p> },
        { h: 'Key design decisions', body: <UL items={[<><strong>Quarantine, don’t drop:</strong> failed rows stay inspectable and can be re-processed.</>, <><strong>Measure quality independently of the rule configuration,</strong> so a disabled rule cannot make the data look better.</>, <><strong>Pure functions per stage:</strong> every step is testable and every run reproducible, at the cost of recomputing everything on change.</>]} /> },
        { h: 'Testing', body: <><p>15 tests in <span className="mono">tests/pipeline.test.ts</span> cover row counts per stage, quarantine assignments, both deduplication rules, date parsing, FX conversion, metric totals, lineage and row-count controls. The monthly SQL over the model is checked against the TypeScript metrics.</p><SqlPanel file="pipeline_model.sql" only={['monthly_volume_by_channel']} /></> },
        { h: 'Results (synthetic)', body: <UL items={[`${c.p.counts.map((x) => `${x.stage} ${x.rows}`).join(' → ')}.`, `${c.p.quarantined.length} rows quarantined, ${c.p.dedup.exactDuplicates.length + c.p.dedup.keyDuplicates.length} duplicates removed, total volume ${money(c.p.metrics.totalCad)}.`, `Row-count controls balance for ${c.controls.filter((x) => x.balanced).length} of ${c.controls.length} sources.`]} /> },
        { h: 'Limitations and what production would need', body: <UL items={['Orchestration, incremental loads and late-arriving data.', 'Slowly changing dimensions and daily FX rates.', 'Hosted storage, scheduling and monitoring. None of these are implemented here.']} /> },
        { h: 'Professional relevance', body: <p>This relates to the resume skills of data validation, source-to-target mapping, migration testing and SQL Server, and to reconciling transactions against ERP finance records.</p> },
      ],
    },
  ];

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">Case studies</div>
          <h1>Technical case studies</h1>
          <p className="lead">Gabriel’s ERP implementation experience, followed by one case study per lab. For each: business context, approach, architecture, key design decisions, testing, results, limitations and professional relevance. Results are computed live by the same engines the labs use.</p>
          <nav className="row" aria-label="Case studies">{studies.map((s) => <a key={s.id} href="#/case-studies" onClick={(e) => { e.preventDefault(); document.getElementById(`cs-${s.id}`)?.scrollIntoView({ behavior: 'smooth' }); }} className="btn btn-secondary btn-sm">{s.short}</a>)}</nav>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container stack">
          <div className="callout info"><p className="small"><strong>Two kinds of case study.</strong> Case study 1 describes Gabriel’s real ERP implementation experience in general terms, with confidential details removed. Case studies 2–5 describe synthetic portfolio simulations. Those are not accounts of client engagements, and the software is not approved for regulatory use.</p></div>
          {studies.map((s, i) => (
            <article key={s.id} id={`cs-${s.id}`} className="card case-study" style={{ scrollMarginTop: 80 }}>
              <div className="row" style={{ gap: 8 }}><div className="eyebrow" style={{ margin: 0 }}>Case study {i + 1} · {s.short}</div>{s.real ? <Badge tone="green">Professional experience · anonymised</Badge> : <Badge tone="amber">Synthetic demonstration</Badge>}</div>
              <h2 style={{ marginTop: 8 }}>{s.title}</h2>
              <div className="stack">
                {s.sections.map((sec) => (
                  <section key={sec.h}>
                    <h3>{sec.h}</h3>
                    <div className="cs-body">{sec.body}</div>
                  </section>
                ))}
              </div>
              <Link to={s.lab} query={s.real ? { section: 'erp-implementation' } : undefined} className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>{s.labLabel ?? 'Open the lab'}</Link>
            </article>
          ))}
          <div className="callout info">
            <h4>How this portfolio was built</h4>
            <p className="small">{AI_DISCLOSURE}</p>
          </div>
        </div>
      </section>
    </>
  );
}
