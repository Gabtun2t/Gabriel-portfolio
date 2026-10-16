import { Link } from '../router';
import { PROFILE } from '../content/profile';
import { aml } from '../data/instances';
import { Badge, StatusPill } from '../components/ui';
import { money0 } from '../lib/format';
import { LAB_STATUS } from './Labs';

export function Home() {
  const { ds, alerts } = aml();
  const top = [...alerts].sort((a, b) => b.score - a.score).slice(0, 3);
  const s5 = alerts.find((a) => a.customerId === 'CUS-1031')!;
  const s6 = alerts.find((a) => a.customerId === 'CUS-1015')!;
  const name = (id: string) => ds.customers.find((c) => c.customerId === id)!.name;

  return (
    <>
      <section className="page-hero hero-home">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow">{PROFILE.location}</div>
            <h1>{PROFILE.headline}</h1>
            <p className="lead">{PROFILE.proposition}</p>
            <p style={{ color: 'var(--navy-muted)', maxWidth: 700 }}>
              9+ years in ERP and financial systems (Sage X3, Sage 300, Acumatica), including AML-related transaction reviews and KYC-related checks on client projects — and telling genuine risk indicators apart from data-migration errors.
            </p>
            <div className="row" style={{ marginTop: 24 }}>
              <Link to="/labs/aml" className="btn btn-primary">Open the AML investigation lab</Link>
              <a href={PROFILE.resumePdf} className="btn btn-secondary" download>Download resume (PDF)</a>
              <Link to="/guide" className="btn btn-secondary">Recruiter guide</Link>
            </div>
          </div>
          <aside className="hero-panel" aria-label="Live demo: highest-scoring synthetic alerts">
            <div className="row between">
              <h3 style={{ margin: 0 }}>Live from the AML lab</h3>
              <span className="badge badge-sim">Synthetic</span>
            </div>
            <p className="small" style={{ color: 'var(--navy-muted)', margin: '6px 0 4px' }}>
              {ds.transactions.length.toLocaleString('en-CA')} fictional transactions screened by 7 rules in your browser → {alerts.length} alerts. Highest scores:
            </p>
            {top.map((a) => (
              <Link key={a.caseId} to="/labs/aml" query={{ tab: 'case', case: a.caseId }} className="alert-row">
                <span>
                  <strong className="mono">{a.caseId}</strong> · {name(a.customerId)}
                  <small>{a.hits.length} rule(s) · {a.primaryCategory} · {money0(a.involvedAmount)}</small>
                </span>
                <span className={`badge badge-${a.band === 'High' ? 'red' : a.band === 'Medium' ? 'amber' : 'neutral'}`}>{a.band} {a.score}</span>
              </Link>
            ))}
            <p className="small" style={{ color: 'var(--navy-muted)', margin: '10px 0 0' }}>Alerts are prompts for human review, not findings of wrongdoing.</p>
          </aside>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">Start here</div>
              <h2>Three ways to evaluate this portfolio</h2>
            </div>
            <p>Each path takes 2–5 minutes and ends at working software, not screenshots.</p>
          </div>
          <div className="grid cols-3">
            <Link to="/labs/aml" query={{ tab: 'case', case: s6.caseId }} className="card card-link">
              <Badge tone="teal">AML / financial crime</Badge>
              <h3 style={{ marginTop: 10 }}>Investigate an alert</h3>
              <p className="muted">Open a cash-structuring case: review the customer’s KYC profile, the triggered rules, evidence checks, then record a reasoned disposition and export the case narrative.</p>
            </Link>
            <Link to="/labs/reconciliation" className="card card-link">
              <Badge tone="blue">ERP / financial systems</Badge>
              <h3 style={{ marginTop: 10 }}>Run a migration reconciliation</h3>
              <p className="muted">Reconcile a legacy extract against a migrated ERP ledger, trace each exception to its root cause, apply corrections and re-run validation.</p>
            </Link>
            <Link to="/labs/payments" className="card card-link">
              <Badge tone="violet">Architecture / data</Badge>
              <h3 style={{ marginTop: 10 }}>Break a payment integration</h3>
              <p className="muted">Send a payment through a mock bank API, inject a timeout after commit, and see how idempotency keys prevent a duplicate debit — then inspect the data pipeline lineage.</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">Practice areas</div>
              <h2>Four connected tracks</h2>
            </div>
            <p>Each track pairs professional experience (from the resume) with a portfolio demonstration (synthetic).</p>
          </div>
          <div className="tracks">
            {[
              { n: '01', t: 'AML & financial-crime investigation', d: 'Transaction review, KYC-related checks, alert triage and escalation — with the judgement to separate risk indicators from data defects.', pro: 'AML-related transaction reviews and KYC-related checks on financial-institution, microfinance and oil-and-gas client projects; escalation to compliance.', demo: 'AML lab', to: '/labs/aml' },
              { n: '02', t: 'ERP & financial systems', d: 'GL/AP/AR configuration, data migration, reconciliation and UAT across Sage X3, Sage 300 and Acumatica.', pro: 'Sage X3 implementations, V11→V12 upgrade, migrated-record reconciliation; ERP production investigations at Acumatica.', demo: 'Reconciliation lab', to: '/labs/reconciliation' },
              { n: '03', t: 'Data analytics & engineering', d: 'SQL-based investigation, validation rules, deduplication, lineage and reproducible financial metrics.', pro: 'SQL Server, source-to-target mapping, data validation and migration testing.', demo: 'Data engineering lab', to: '/labs/data' },
              { n: '04', t: 'Solution & integration architecture', d: 'Payment API ↔ ERP flows, idempotency, retries, audit trails and reconciliation controls.', pro: 'Supported a bank payment API ↔ Sage 300 integration with an internal developer; ERP interface troubleshooting.', demo: 'Payment API lab', to: '/labs/payments' },
            ].map((t) => (
              <div key={t.n}>
                <div className="num">{t.n}</div>
                <h3 style={{ marginTop: 4 }}>{t.t}</h3>
                <p className="muted small">{t.d}</p>
                <div className="evidence-line"><Badge tone="green">Experience</Badge><span>{t.pro}</span></div>
                <div className="evidence-line"><Badge tone="amber">Demo</Badge><span><Link to={t.to}>{t.demo}</Link> (synthetic data)</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid cols-2" style={{ alignItems: 'center' }}>
            <div>
              <div className="eyebrow">Signature story</div>
              <h2>Is it suspicious — or is it the data?</h2>
              <p className="lead">Unusual activity can require escalation. But some anomalies come from duplicated or corrupted financial data. The lab teaches the difference through evidence, not assumptions.</p>
              <p className="muted">Both cases below are from the same synthetic dataset. One alert disappears when an evidence-supported data correction is applied; the other does not change at all.</p>
              <Link to="/case-studies" className="btn btn-secondary">Read the case study</Link>
            </div>
            <div className="grid" style={{ gap: 12 }}>
              <Link to="/labs/aml" query={{ tab: 'case', case: s5.caseId }} className="card card-link tight">
                <div className="row between"><strong className="mono">{s5.caseId}</strong><Badge tone="violet">Data defect</Badge></div>
                <p className="small" style={{ margin: '6px 0 0' }}>{money0(1245000)} receipt for a farm-supply business. The source ERP says {money0(12450)}. Migrated amount is exactly ×100; batch MIG-0612 has a logged scale defect. <strong>Re-evaluated with the source amount: no rule fires.</strong></p>
              </Link>
              <Link to="/labs/aml" query={{ tab: 'case', case: s6.caseId }} className="card card-link tight">
                <div className="row between"><strong className="mono">{s6.caseId}</strong><Badge tone="red">Unresolved</Badge></div>
                <p className="small" style={{ margin: '6px 0 0' }}>Four cash deposits of $9,400–$9,900 across three branches in five days, then a $37,000 wire out. Live core data, no data issue, no response to the request for information. <strong>Escalation is supported; closure is blocked.</strong></p>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">Project lab</div>
              <h2>Working demonstrations</h2>
            </div>
            <Link to="/status">Full feature status →</Link>
          </div>
          <div className="grid cols-4">
            {LAB_STATUS.map((l) => (
              <Link key={l.to} to={l.to} className="card card-link">
                <div className="row between"><span className="mono small muted">{l.code}</span><StatusPill status={l.status} /></div>
                <h3 style={{ marginTop: 8 }}>{l.title}</h3>
                <p className="muted small">{l.blurb}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="callout info">
            <h4>What is real and what is simulated</h4>
            <p className="small">Employment history, skills, education and credentials come from Gabriel’s resume. The four labs are independent portfolio simulations built on synthetic, seeded data. They are not client engagements, production systems or reproductions of any employer’s or client’s software. No certification beyond those listed on the <Link to="/experience">Experience</Link> page is claimed.</p>
          </div>
        </div>
      </section>
    </>
  );
}
