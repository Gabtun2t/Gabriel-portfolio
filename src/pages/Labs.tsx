import { Link } from '../router';
import { SimBanner, StatusPill } from '../components/ui';

export const LAB_STATUS: { code: string; to: string; title: string; status: 'Implemented' | 'Partial' | 'Planned'; blurb: string; features: string[] }[] = [
  {
    code: 'LAB 1', to: '/labs/aml', title: 'AML transaction monitoring & investigation', status: 'Implemented',
    blurb: 'Seven deterministic rules over 40 fictional customers and ~2,400 transactions; alert queue, evidence, dispositions, case narrative export.',
    features: ['Reproducible seeded dataset', 'Explainable scoring', 'Filter/sort/search queue', 'KYC-related profile', 'Evidence & data-correction re-evaluation', 'Reasoned dispositions', 'Exportable SIMULATION narrative', 'Rule source + automated tests'],
  },
  {
    code: 'LAB 2', to: '/labs/reconciliation', title: 'ERP reconciliation & migration integrity', status: 'Implemented',
    blurb: 'Legacy extract vs. migrated ERP ledger with seeded defects; transparent matching, lineage, root cause, simulated correction and re-run.',
    features: ['Run on demand', 'Matching rules M0–M5', 'Root-cause hints', 'Source-to-target lineage', 'Corrections + audit journal', 'SQL verified against SQLite'],
  },
  {
    code: 'LAB 3', to: '/labs/payments', title: 'Mock bank payment API ↔ ERP', status: 'Implemented',
    blurb: 'Schema validation, idempotency keys, injected faults, retries with back-off, audit trail and payment reconciliation — fully local.',
    features: ['Schema validation', 'Idempotency & replay', '503/429/timeout/422 paths', 'Exponential back-off', 'Masked audit trail', 'ERP ↔ bank reconciliation'],
  },
  {
    code: 'LAB 4', to: '/labs/data', title: 'Financial data engineering', status: 'Implemented',
    blurb: 'Three raw feeds through standardize → validate → deduplicate → model → metrics, with quarantine, lineage tracing and DQ scores.',
    features: ['Ingestion of 3 formats', 'Toggleable validation rules', 'Exact + key deduplication', 'Star schema', 'Lineage tracer', 'Computed dashboard'],
  },
];

export function Labs() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">Project lab</div>
          <h1>Four working labs on synthetic data</h1>
          <p className="lead">Every number on these pages is computed in your browser from seeded data by code you can read on the page. Each lab links to its rules, tests and SQL.</p>
        </div>
      </section>
      <section className="section">
        <div className="container stack">
          <SimBanner />
          <div className="grid cols-2">
            {LAB_STATUS.map((l) => (
              <div key={l.to} className="card">
                <div className="row between"><span className="mono small muted">{l.code}</span><StatusPill status={l.status} /></div>
                <h2 style={{ fontSize: 22, marginTop: 8 }}>{l.title}</h2>
                <p className="muted">{l.blurb}</p>
                <ul className="small" style={{ columns: 2, paddingLeft: 18, margin: '0 0 14px' }}>
                  {l.features.map((f) => <li key={f}>{f}</li>)}
                </ul>
                <Link to={l.to} className="btn btn-primary btn-sm">Open {l.code.toLowerCase()}</Link>
              </div>
            ))}
          </div>
          <p className="small muted">Known limitations of each lab are listed on the <Link to="/status">build status</Link> page and in each case study.</p>
        </div>
      </section>
    </>
  );
}
