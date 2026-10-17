import { Link } from '../router';
import { aml } from '../data/instances';
import { RESUMES } from '../content/profile';

export function Guide() {
  const { alerts } = aml();
  const caseOf = (cid: string) => alerts.find((a) => a.customerId === cid)!.caseId;
  const paths = [
    {
      who: 'Hiring for ERP / financial systems', time: '5 minutes', steps: [
        <>Read the <Link to="/experience" query={{ section: 'erp-implementation' }}>ERP implementation experience</Link>: the featured led implementation, types of ERP work, capability areas and industries.</>,
        <>Read the <Link to="/case-studies" query={{ study: 'erp' }}>ERP implementation case study</Link> (real experience, anonymised).</>,
        <>Open the <Link to="/labs/reconciliation">reconciliation lab</Link>, run it, and inspect the ×100 decimal shift and a “Missing in ERP” row.</>,
        <>Apply all corrections and re-run; note the two manual journals left for finance review.</>,
      ], look: 'Real Sage 300 implementation leadership and Sage X3 / Sage 300 consulting experience, plus source-to-target thinking, root-cause tracing and controlled corrections.',
    },
    {
      who: 'Hiring for AML / financial crime', time: '5 minutes', steps: [
        <>Open <Link to="/labs/aml" query={{ tab: 'case', case: caseOf('CUS-1015') }}>{caseOf('CUS-1015')}</Link> (cash just below $10,000). Read the triggered rules and the KYC-related profile.</>,
        <>Review the evidence panel; note that “Close as explained exception” is disabled and why.</>,
        <>Record “Escalate to compliance” with a rationale, then open the case narrative (marked SIMULATION) and the teaching note.</>,
        <>Compare with <Link to="/labs/aml" query={{ tab: 'case', case: caseOf('CUS-1031') }}>{caseOf('CUS-1031')}</Link>: same rules, but lineage and the ERP cross-check show a decimal-shift defect.</>,
      ], look: 'Proportionate dispositions, evidence before conclusions, no automated “fraud” verdicts, explainable non-demographic risk factors.',
    },
    {
      who: 'Hiring for architecture / data', time: '5–10 minutes', steps: [
        <>In the <Link to="/labs/payments">payment API lab</Link>, run “Timeout after bank commit”, then the same scenario with idempotency off.</>,
        <>Read the design decisions and security notes under the architecture diagram.</>,
        <>In the <Link to="/labs/data">data lab</Link>, disable the currency rule and watch the unconverted-amount warning; trace a deduplicated fact to its raw deliveries.</>,
        <>Check the <Link to="/architecture">architecture page</Link>, SQL parity checks and the <Link to="/status">build status</Link>.</>,
      ], look: 'Idempotency and failure-mode design, lineage, data-quality measurement, tested and reproducible logic, honest limitations.',
    },
  ];
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">Recruiter guide</div>
          <h1>What to explore, by role</h1>
          <p className="lead">Everything runs in the browser. Nothing requires an account. Decisions you record are stored only in your browser.</p>
        </div>
      </section>
      <section className="section">
        <div className="container stack">
          <div className="card" aria-label="Resumes">
            <h2 style={{ fontSize: 20, margin: '0 0 6px' }}>Resumes</h2>
            <p className="small muted" style={{ margin: '0 0 10px' }}>Two separate resumes. Choose the one that matches the role.</p>
            <div className="row">
              {RESUMES.filter((r) => r.file).map((r, i) => <a key={r.id} href={r.file!} className={`btn btn-sm ${i === 0 ? 'btn-primary' : 'btn-secondary'}`} download>{r.label} (PDF)</a>)}
            </div>
          </div>
          <div className="grid cols-3">
            {paths.map((p) => (
              <div key={p.who} className="card">
                <h3>{p.who}</h3>
                <p className="small muted">{p.time}</p>
                <ol className="steps small">{p.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                <p className="small"><strong>What it shows:</strong> {p.look}</p>
              </div>
            ))}
          </div>
          <div className="grid cols-2">
            <div className="card">
              <h3>Real (from the resume)</h3>
              <ul className="small" style={{ paddingLeft: 18 }}>
                <li>Employment, dates, education, skills, certifications and training.</li>
                <li>Implementation Lead on Sage 300 projects, including an approximately 18-month, phased, estate-wide implementation; other Sage X3 and Sage 300 implementations and consulting (Softcodes); Sage X3 implementation support (Panni); and enterprise ERP support (Acumatica).</li>
                <li>AML-related transaction reviews and KYC-related checks at Panni and on Softcodes client projects; escalation to compliance; tracing some exceptions to migration-related data corruption.</li>
                <li>Support for a bank payment API ↔ Sage 300 integration with an internal developer.</li>
              </ul>
            </div>
            <div className="card">
              <h3>Simulated (portfolio work)</h3>
              <ul className="small" style={{ paddingLeft: 18 }}>
                <li>All four labs, their data, institutions, customers and outcomes.</li>
                <li>Rule thresholds, weights and scenarios — illustrative, not calibrated.</li>
                <li>Not claimed: CAMS or other AML certification, STR/SAR filing, specific AML vendor tools, investigation volumes or quantified outcomes.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
