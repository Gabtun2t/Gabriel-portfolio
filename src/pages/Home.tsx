import { Link } from '../router';
import { PROFILE, resumeFor } from '../content/profile';
import { Badge } from '../components/ui';

/**
 * Recruiter-first homepage, built for 15 / 30 / 90 seconds:
 * 15s: who, expertise, seniority, target roles, resumes (hero).
 * 30s: three verified reasons to interview, then the two career tracks.
 * 90s: featured projects (one sentence each) and contact. Depth lives on the track and project pages.
 */
const TARGET_ROLES = ['ERP Implementation Lead', 'Senior ERP Consultant', 'Senior Financial Systems Analyst', 'ERP Integration Consultant', 'Senior AML Analyst', 'Financial Crime Analyst', 'AML Technology Specialist'];

const REASONS = [
  { title: 'ERP implementation leadership', text: 'Implementation Lead for an approximately 18-month, phased, estate-wide Sage 300 implementation, coordinating the client, the development team and the implementation team. Led the Sage X3 finance workstream on each Panni client implementation.', to: '/erp', cta: 'See the implementation' },
  { title: 'Enterprise integrations', text: 'Coordinated delivery of a custom Sage 300 integration built by the internal development team, partnered on a bank payment API ↔ Sage 300 integration, and led or supported ERP data migration and reconciliation.', to: '/erp', cta: 'See integration work' },
  { title: 'Senior technical investigation', text: 'Senior Support Engineer at Acumatica since April 2026, using SQL, Kibana (since 2025) and Shopify, Amazon, BigCommerce and REST/GraphQL integration troubleshooting to investigate complex enterprise issues.', to: '/experience', cta: 'See experience' },
];

const PROJECTS = [
  { to: '/labs/aml', title: 'AML transaction monitoring & investigation', problem: 'Analysts must tell genuinely suspicious activity apart from alerts caused by bad data.', shows: 'Explainable rules, an evidence checklist and reasoned dispositions on a synthetic alert queue.' },
  { to: '/labs/reconciliation', title: 'ERP reconciliation & migration integrity', problem: 'Migrated ledgers can silently drift from the legacy system they replace.', shows: 'Source-to-target matching, root-cause tracing and audited corrections, with SQL checked on SQLite.' },
  { to: '/labs/payments', title: 'Payment API ↔ ERP integration', problem: 'A lost bank response can lead to a payment being sent twice.', shows: 'Idempotency keys, retries and timeouts, with an audit trail and bank-to-ERP reconciliation.' },
  { to: '/labs/data', title: 'Financial data engineering', problem: 'Reports built on unvalidated feeds produce wrong numbers.', shows: 'Validation, quarantine, deduplication, a star schema and lineage back to raw records.' },
];

export function Home() {
  const erp = resumeFor('erp');
  const amlR = resumeFor('aml');
  return (
    <>
      <section className="page-hero hero-home">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow">{PROFILE.location}</div>
            <h1 style={{ fontSize: 'clamp(32px, 4.4vw, 50px)', marginBottom: 6 }}>{PROFILE.name}</h1>
            <p className="hero-title">{PROFILE.title}</p>
            <p className="lead">{PROFILE.tagline}</p>
            <div className="row hero-actions">
              <Link to="/erp" className="btn btn-primary">View ERP experience</Link>
              <Link to="/aml" className="btn btn-secondary">Explore AML technology</Link>
            </div>
            <div className="resume-choice" role="group" aria-label="Download resume">
              <span>Download resume</span>
              <a href={erp.file} className="btn btn-secondary btn-sm" download>ERP & Financial Systems (PDF)</a>
              <a href={amlR.file} className="btn btn-secondary btn-sm" download>AML & Financial Crime (PDF)</a>
            </div>
          </div>
          <aside className="hero-panel" aria-label="At a glance">
            <h2 className="hero-panel-title">At a glance</h2>
            <dl className="glance">
              <dt>Now</dt><dd>Senior Support Engineer, Acumatica (since Apr 2026)</dd>
              <dt>Led</dt><dd>~18-month, phased Sage 300 implementation</dd>
              <dt>Platforms</dt><dd>Sage 300 · Sage X3 · Acumatica</dd>
              <dt>Certified</dt><dd>Sage X3 Technical, Financial and Distribution Consultant</dd>
              <dt>Teaching</dt><dd>Contract Instructor since 2024</dd>
            </dl>
            <p className="glance-roles"><strong>Suited to:</strong> {TARGET_ROLES.join(' · ')}</p>
          </aside>
        </div>
      </section>

      <section className="section home-section" aria-labelledby="reasons">
        <div className="container">
          <h2 id="reasons" className="home-h2">Three reasons to interview Gabriel</h2>
          <div className="grid cols-3">
            {REASONS.map((r, i) => (
              <div key={r.title} className="card stack reason">
                <span className="reason-num">{i + 1}</span>
                <h3 style={{ margin: 0 }}>{r.title}</h3>
                <p className="small" style={{ margin: 0 }}>{r.text}</p>
                <Link to={r.to} className="small" style={{ marginTop: 'auto' }}>{r.cta} →</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section home-section" aria-labelledby="tracks">
        <div className="container">
          <h2 id="tracks" className="home-h2">Choose your career track</h2>
          <div className="grid cols-2">
            <div className="card stack track-card">
              <Badge tone="blue">Primary track</Badge>
              <h3 style={{ margin: 0 }}>ERP & Financial Systems</h3>
              <p className="small" style={{ margin: 0 }}>Nine-plus years implementing, integrating and supporting Sage 300, Sage X3 and Acumatica for finance and operations teams.</p>
              <ul className="small tight-list">
                <li>Featured: Implementation Lead, ~18-month phased Sage 300 implementation</li>
                <li>Sage X3 finance workstream lead (GL, AP, AR, Fixed Assets, migration, UAT)</li>
                <li>Integrations, data migration, reconciliation, consultant on a Sage X3 V11 → V12 upgrade</li>
              </ul>
              <div className="row" style={{ marginTop: 'auto' }}>
                <Link to="/erp" className="btn btn-primary btn-sm">ERP experience</Link>
                <a href={erp.file} className="btn btn-secondary btn-sm" download>ERP resume (PDF)</a>
              </div>
            </div>
            <div className="card stack track-card">
              <Badge tone="teal">AML & financial crime</Badge>
              <h3 style={{ margin: 0 }}>AML Compliance & Financial Crime</h3>
              <p className="small" style={{ margin: 0 }}>AML-related transaction reviews, KYC checks, suspicious transaction identification and compliance escalation, backed by deep financial systems, SQL and payment integration expertise.</p>
              <ul className="small tight-list">
                <li>Transaction reviews and KYC checks for financial-institution, microfinance banking, and oil and gas clients</li>
                <li>Suspicious activity identified and escalated to compliance teams</li>
                <li>Financial data investigations separating genuine risk from ERP data defects</li>
              </ul>
              <div className="row" style={{ marginTop: 'auto' }}>
                <Link to="/aml" className="btn btn-primary btn-sm">AML experience</Link>
                <Link to="/labs/aml" className="btn btn-secondary btn-sm">AML lab</Link>
                <a href={amlR.file} className="btn btn-secondary btn-sm" download>AML resume (PDF)</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section home-section" aria-labelledby="work">
        <div className="container">
          <div className="section-head">
            <h2 id="work" className="home-h2" style={{ margin: 0 }}>Featured technical work</h2>
            <p className="small muted" style={{ margin: 0 }}>Interactive simulations on synthetic data, not client work. <Link to="/labs">All projects →</Link></p>
          </div>
          <div className="grid cols-4">
            {PROJECTS.map((p) => (
              <div key={p.to} className="card stack project-card">
                <span className="badge badge-sim" style={{ alignSelf: 'flex-start' }}>Simulation</span>
                <h3 style={{ margin: 0, fontSize: 16 }}>{p.title}</h3>
                <p className="small" style={{ margin: 0 }}><strong>Problem:</strong> {p.problem}</p>
                <p className="small muted" style={{ margin: 0 }}><strong>Shows:</strong> {p.shows}</p>
                <Link to={p.to} className="btn btn-secondary btn-sm" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>View project</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section home-section" aria-labelledby="contact-h">
        <div className="container">
          <div className="card contact-band">
            <div>
              <h2 id="contact-h" className="home-h2" style={{ margin: 0 }}>Contact</h2>
              <p className="small" style={{ margin: '6px 0 0' }}>
                <a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>
                {PROFILE.showPhone && <> · <a href={`tel:+1${PROFILE.phone.replace(/\D/g, '')}`}>{PROFILE.phone}</a></>}
                {PROFILE.linkedinUrl && <> · <a href={PROFILE.linkedinUrl} target="_blank" rel="noopener noreferrer">LinkedIn</a></>}
              </p>
            </div>
            <div className="row">
              <a href={erp.file} className="btn btn-primary btn-sm" download>{erp.label} (PDF)</a>
              <a href={amlR.file} className="btn btn-secondary btn-sm" download>{amlR.label} (PDF)</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
