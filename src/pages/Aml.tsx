import { Link } from '../router';
import { SKILL_EVIDENCE, resumeFor } from '../content/profile';
import { aml } from '../data/instances';
import { Badge } from '../components/ui';
import { money0 } from '../lib/format';

const CAPABILITIES = [
  { title: 'Transaction review', text: 'AML-related reviews of financial transactions for financial-institution, microfinance banking, and oil and gas clients, and on AML-related Sage X3 workstreams.', where: 'Softcodes · Panni' },
  { title: 'KYC checks', text: 'KYC checks performed as part of AML-related client workstreams.', where: 'Softcodes · Panni' },
  { title: 'Suspicious activity & escalation', text: 'Identified suspicious or inconsistent transactions and escalated findings to compliance teams.', where: 'Softcodes · Panni' },
  { title: 'Financial data investigations', text: 'Traced exceptions to ERP migration-related data corruption rather than fraud, separating data defects from genuine risk indicators before escalation.', where: 'Softcodes' },
  { title: 'Financial controls & reconciliation', text: 'Reconciled reviewed transactions against Sage X3 finance records and validated migrated financial data against source.', where: 'Panni · Softcodes' },
  { title: 'Complex anomaly investigation', text: 'SQL and Kibana investigation of transaction anomalies in enterprise ERP, with cross-team coordination on high-impact cases.', where: 'Acumatica' },
];

const TRANSFER = ['AML transaction review & exception analysis', 'Suspicious-activity identification & compliance escalation', 'Distinguishing risk indicators from data defects', 'Financial data reconciliation & migration integrity', 'SQL-based investigation', 'Payment API integration support'];

/** AML compliance & financial crime track: professional experience first, then the clearly labelled simulation. */
export function Aml() {
  const { alerts } = aml();
  const s5 = alerts.find((a) => a.customerId === 'CUS-1031')!;
  const s6 = alerts.find((a) => a.customerId === 'CUS-1015')!;
  const r = resumeFor('aml');
  const rows = SKILL_EVIDENCE.filter((e) => TRANSFER.includes(e.skill));
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">AML compliance · financial crime · AML technology</div>
          <h1>AML compliance & financial crime experience</h1>
          <p className="lead">AML-related transaction reviews, KYC checks, suspicious transaction identification and compliance escalation for financial institutions, microfinance banks and oil and gas clients, backed by nine-plus years of financial systems, SQL and payment integration expertise.</p>
          <div className="row">
            <a href={r.file} className="btn btn-primary" download>{r.label} (PDF)</a>
            <Link to="/labs/aml" className="btn btn-secondary">AML investigation lab</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container stack">
          <section aria-labelledby="aml-real">
            <div className="row" style={{ gap: 6, marginBottom: 6 }}><Badge tone="green">Professional experience</Badge></div>
            <h2 id="aml-real" style={{ marginTop: 0 }}>AML & financial crime experience</h2>
            <div className="grid cols-3">
              {CAPABILITIES.map((c) => (
                <div key={c.title} className="card stack reason">
                  <h3 style={{ margin: 0, fontSize: 17 }}>{c.title}</h3>
                  <p className="small" style={{ margin: 0 }}>{c.text}</p>
                  <small className="muted" style={{ marginTop: 'auto' }}>{c.where}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="card" aria-labelledby="aml-where">
            <h2 id="aml-where" style={{ fontSize: 20 }}>Where the experience was gained</h2>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Role</th><th>AML & financial crime responsibilities</th></tr></thead>
                <tbody>
                  <tr><td><strong>Senior Technical Consultant</strong><br /><span className="small muted">Softcodes International · 2016 – 2021</span></td><td className="small">Reviewed transactions and performed KYC checks for financial-institution, microfinance banking, and oil and gas client engagements; escalated suspicious findings to compliance teams; traced some exceptions to ERP migration-related data corruption rather than fraud. Partnered on a bank payment API ↔ Sage 300 integration.</td></tr>
                  <tr><td><strong>Finance Analyst (Sage X3)</strong><br /><span className="small muted">Panni Management & Technology · 2022 – 2023</span></td><td className="small">Reviewed financial transactions and performed KYC checks on AML-related workstreams; flagged suspicious or inconsistent activity to compliance teams; reconciled reviewed transactions against Sage X3 finance records.</td></tr>
                  <tr><td><strong>Senior Support Engineer</strong> (since Apr 2026)<br /><span className="small muted">Acumatica · Product Support Specialist Jul 2023 – Mar 2026</span></td><td className="small">Investigates complex financial transaction anomalies with SQL and Kibana (since 2025), separating data, process and system defects, and coordinates high-impact cases with Product, Engineering and Consulting.</td></tr>
                </tbody>
              </table>
            </div>
            <p className="small muted" style={{ margin: '10px 0 0' }}>Performed within ERP and financial systems consulting engagements, where AML review sat alongside the systems that produce the transaction data. Completed AML training (LinkedIn Learning).</p>
          </section>

          <section className="card" aria-labelledby="aml-transfer">
            <h2 id="aml-transfer" style={{ fontSize: 20 }}>The systems advantage</h2>
            <p className="small muted">Knowing how transaction data is created, migrated and integrated makes it faster to tell genuine risk from a data defect.</p>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Capability</th><th>Professional evidence</th><th>Demonstrated in <span className="badge badge-sim">Simulation</span></th></tr></thead>
                <tbody>{rows.map((e) => <tr key={e.skill}><td><strong>{e.skill}</strong></td><td className="small">{e.professional}</td><td className="small"><Link to={e.demoLink}>{e.demo}</Link></td></tr>)}</tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="aml-story">
            <div className="section-head">
              <div>
                <div className="eyebrow">Technical demonstration <span className="badge badge-sim" style={{ marginLeft: 6 }}>Simulation</span></div>
                <h2 id="aml-story">Is it suspicious, or is it the data?</h2>
              </div>
              <p>Two synthetic alerts trigger the same rules. One disappears when an evidence-supported data correction is applied; the other does not.</p>
            </div>
            <div className="grid cols-2">
              <Link to="/labs/aml" query={{ tab: 'case', case: s5.caseId }} className="card card-link tight">
                <div className="row between"><strong className="mono">Scenario A · {s5.caseId}</strong><Badge tone="violet">Migration false positive</Badge></div>
                <p className="small" style={{ margin: '6px 0 0' }}>A {money0(1245000)} receipt where the source ERP says {money0(12450)}: the migrated amount is exactly ×100. <strong>Re-evaluated with the source amount, no rule fires.</strong></p>
              </Link>
              <Link to="/labs/aml" query={{ tab: 'case', case: s6.caseId }} className="card card-link tight">
                <div className="row between"><strong className="mono">Scenario B · {s6.caseId}</strong><Badge tone="red">Unresolved</Badge></div>
                <p className="small" style={{ margin: '6px 0 0' }}>Four cash deposits of $9,400–$9,900 in five days, then a $37,000 wire out, with no data issue. <strong>Escalation is supported; closure is blocked.</strong></p>
              </Link>
            </div>
            <div className="row" style={{ marginTop: 14 }}>
              <Link to="/labs/aml" className="btn btn-primary btn-sm">Open the AML investigation lab</Link>
              <Link to="/labs/aml" query={{ tab: 'method' }} className="btn btn-secondary btn-sm">Methodology</Link>
              <Link to="/case-studies" query={{ study: 'aml' }} className="btn btn-secondary btn-sm">AML case study</Link>
              <Link to="/labs/data" className="btn btn-secondary btn-sm">Data engineering lab</Link>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
