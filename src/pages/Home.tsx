import { Link } from '../router';
import { ERP_LIFECYCLE, LED_ENGAGEMENTS, PROFILE, resumeFor } from '../content/profile';
import { aml } from '../data/instances';
import { Badge, StatusPill } from '../components/ui';
import { Diagram } from '../components/Diagram';
import { money0 } from '../lib/format';
import { LAB_STATUS } from './Labs';

export function Home() {
  const { ds, alerts } = aml();
  const top = [...alerts].sort((a, b) => b.score - a.score).slice(0, 3);
  const s5 = alerts.find((a) => a.customerId === 'CUS-1031')!;
  const s6 = alerts.find((a) => a.customerId === 'CUS-1015')!;
  const name = (id: string) => ds.customers.find((c) => c.customerId === id)!.name;
  const amlResume = resumeFor('aml');
  const erpResume = resumeFor('erp');

  const pathways: { tone: string; track: string; title: string; text: string; to: string; query?: Record<string, string>; cta: string; second?: { to: string; label: string }; resume: { label: string; file: string } }[] = [
    {
      tone: 'blue', track: 'ERP / Financial systems', title: 'ERP implementation & financial systems',
      text: 'Implementation Lead on Sage 300 projects, including an approximately 18-month, phased, estate-wide implementation. Five years of Sage X3 and Sage 300 work in total: requirements, configuration, data migration, UAT, go-live, integrations and an upgrade. Then run the migration reconciliation lab, which mirrors that validation work.',
      to: '/experience', query: { section: 'erp-implementation' }, cta: 'See ERP implementation experience', second: { to: '/labs/reconciliation', label: 'Reconciliation lab' }, resume: erpResume,
    },
    {
      tone: 'teal', track: 'AML / Financial crime', title: 'Investigate an alert',
      text: 'Open a case with repeated cash deposits just under $10,000. Review the KYC-related profile, the rules that fired, the evidence checklist and the escalation decision, then export the case narrative.',
      to: '/labs/aml', query: { tab: 'case', case: s6.caseId }, cta: 'Open the AML case', resume: amlResume,
    },
    {
      tone: 'violet', track: 'Architecture / Data', title: 'Break a payment integration',
      text: 'Make the bank accept a payment and lose the response. Compare the result with and without idempotency keys, then trace a data-pipeline record back to its raw source.',
      to: '/labs/payments', cta: 'Open the payment lab', second: { to: '/labs/data', label: 'Data lab' }, resume: erpResume,
    },
  ];

  return (
    <>
      <section className="page-hero hero-home">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow">{PROFILE.name} · {PROFILE.location}</div>
            <h1 style={{ fontSize: 'clamp(30px, 4.2vw, 46px)' }}>{PROFILE.headline}</h1>
            <p style={{ color: '#fff', fontSize: 19, fontWeight: 600, margin: '0 0 10px' }}>{PROFILE.title}</p>
            <ul className="hero-chips" aria-label="Specializations">{PROFILE.specializations.map((x) => <li key={x}>{x}</li>)}</ul>
            <p className="lead">{PROFILE.intro}</p>
            <div className="row" style={{ marginTop: 24 }}>
              <Link to="/experience" query={{ section: 'erp-implementation' }} className="btn btn-primary">ERP implementation experience</Link>
              <Link to="/labs/aml" className="btn btn-secondary">AML investigation lab</Link>
              <a href={erpResume.file} className="btn btn-secondary" download>ERP resume (PDF)</a>
              <a href={amlResume.file} className="btn btn-secondary" download>AML resume (PDF)</a>
              {PROFILE.linkedinUrl && <a href={PROFILE.linkedinUrl} className="btn btn-secondary" target="_blank" rel="noopener noreferrer">LinkedIn</a>}
              <a href={`mailto:${PROFILE.email}`} className="btn btn-secondary">Email</a>
            </div>
          </div>
          <aside className="hero-panel" aria-label="Live demo: highest-scoring synthetic alerts">
            <div className="row between">
              <h2 style={{ margin: 0, fontSize: 14, color: '#fff' }}>Live from the AML lab</h2>
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

      <section className="section" aria-labelledby="glance">
        <div className="container">
          <h2 id="glance" className="sr-only">At a glance</h2>
          <div className="tracks">
            <div>
              <div className="eyebrow">Experience</div>
              <p style={{ margin: 0 }}><strong>9+ years</strong> in ERP and financial systems. <strong>Implementation Lead on Sage 300 projects</strong> during five years of Sage X3 and Sage 300 consulting. Now Senior Support Engineer at Acumatica, resolving complex enterprise ERP issues.</p>
            </div>
            <div>
              <div className="eyebrow">Industry exposure</div>
              <p style={{ margin: 0 }}>Led implementations in <strong>estate management and public-sector water utilities</strong>. Implementation or advisory work in manufacturing and distribution, a bank payment integration, and client engagements in microfinance, oil &amp; gas, investment holding, construction, food services, marine and cannabis. <Link to="/experience" query={{ section: 'industries' }}>Industry detail</Link>.</p>
            </div>
            <div>
              <div className="eyebrow">What is different</div>
              <p style={{ margin: 0 }}>AML-related transaction reviews <strong>combined with ERP data expertise</strong>: escalating suspicious findings to compliance, and tracing some exceptions to migration-related data corruption rather than fraud.</p>
            </div>
            <div>
              <div className="eyebrow">Proof of work</div>
              <p style={{ margin: 0 }}><strong>Four working labs</strong> on synthetic data, with automated tests and SQL checked against SQLite. <Link to="/labs">See the project lab</Link>.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="erp-home">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">Core capability · professional experience</div>
              <h2 id="erp-home">ERP implementation & enterprise systems consulting</h2>
            </div>
            <p>Real client work, not a simulation. Project examples are anonymised: clients are described by sector and location rather than by name.</p>
          </div>
          {LED_ENGAGEMENTS.filter((e) => e.featured).map((e) => (
            <div key={e.role} className="card featured-engagement" style={{ marginBottom: 16 }}>
              <div className="row" style={{ gap: 6, marginBottom: 6 }}><Badge tone="blue">Featured project · led implementation</Badge><Badge tone="green">Professional experience</Badge></div>
              <h3 style={{ margin: '0 0 6px' }}>{e.role} · {e.client}</h3>
              <p className="small" style={{ margin: '0 0 6px' }}><strong>{e.duration}</strong> · {e.delivery} · {e.employer}</p>
              <p className="small" style={{ margin: 0 }}>{e.summary} Requirements and process analysis, Sage 300 configuration, data migration, testing, delivery of a custom integration with the client’s estate management software (developed by the team), user training and phased go-live.</p>
            </div>
          ))}
          <p className="small" style={{ margin: '0 0 16px' }}>Also Implementation Lead for a Sage 300 implementation for a public-sector water utility. Other work: Sage X3 and Sage 300 implementations and advisory support at Softcodes International, Sage X3 implementation support at Panni, and enterprise ERP support at Acumatica.</p>
          <ol className="lifecycle">
            {ERP_LIFECYCLE.map((l) => <li key={l.stage}><strong>{l.stage}</strong><span>{l.what}</span></li>)}
          </ol>
          <div className="row" style={{ marginTop: 16 }}>
            <Link to="/experience" query={{ section: 'erp-implementation' }} className="btn btn-primary btn-sm">ERP implementation experience</Link>
            <Link to="/case-studies" query={{ study: 'erp' }} className="btn btn-secondary btn-sm">ERP implementation case study</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">Start here</div>
              <h2>Choose the path that matches your role</h2>
            </div>
            <p>Each path opens a working demonstration in one click and takes 2–5 minutes.</p>
          </div>
          <div className="grid cols-3">
            {pathways.map((p) => (
              <div key={p.track} className="card stack">
                <Badge tone={p.tone}>{p.track}</Badge>
                <h3 style={{ margin: 0 }}>{p.title}</h3>
                <p className="muted small" style={{ margin: 0 }}>{p.text}</p>
                <div className="row" style={{ marginTop: 'auto' }}>
                  <Link to={p.to} query={p.query} className="btn btn-primary btn-sm">{p.cta}</Link>
                  {p.second && <Link to={p.second.to} className="btn btn-secondary btn-sm">{p.second.label}</Link>}
                  <a href={p.resume.file} className="btn btn-secondary btn-sm" download title={p.resume.label}>Resume (PDF)</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">One thread</div>
              <h2>A transaction is only as trustworthy as the systems it passes through</h2>
            </div>
            <p>The four labs follow the same money: a payment leaves an ERP, lands in a ledger, flows through a data pipeline and is screened by monitoring. Each lab tests one place where that can go wrong.</p>
          </div>
          <div className="card">
            <Diagram label="The thread across the labs: payment integration, ledger reconciliation, data pipeline, transaction monitoring" width={1000} height={130}
              nodes={[
                { id: 'p', x: 10, y: 30, w: 220, h: 64, title: 'Payment API ↔ ERP', sub: 'Was it sent exactly once?', tone: 'accent' },
                { id: 'r', x: 265, y: 30, w: 220, h: 64, title: 'Ledger reconciliation', sub: 'Did it arrive intact?', tone: 'accent' },
                { id: 'd', x: 520, y: 30, w: 220, h: 64, title: 'Data pipeline', sub: 'Is the reporting data clean?', tone: 'accent' },
                { id: 'm', x: 775, y: 30, w: 215, h: 64, title: 'AML monitoring', sub: 'Is it suspicious, or the data?', tone: 'warn' },
              ]}
              edges={[{ from: 'p', to: 'r' }, { from: 'r', to: 'd' }, { from: 'd', to: 'm' }]} />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid cols-2" style={{ alignItems: 'center' }}>
            <div>
              <div className="eyebrow">Signature story</div>
              <h2>Is it suspicious, or is it the data?</h2>
              <p className="lead">Unusual activity can require escalation. But some anomalies come from duplicated or corrupted financial data. The lab teaches the difference through evidence, not assumptions.</p>
              <p className="muted">Both cases come from the same synthetic dataset and trigger the same two rules. One alert disappears when an evidence-supported data correction is applied. The other does not change at all.</p>
              <Link to="/case-studies" className="btn btn-secondary">Read the case study</Link>
            </div>
            <div className="grid" style={{ gap: 12 }}>
              <Link to="/labs/aml" query={{ tab: 'case', case: s5.caseId }} className="card card-link tight">
                <div className="row between"><strong className="mono">Scenario A · {s5.caseId}</strong><Badge tone="violet">Migration false positive</Badge></div>
                <p className="small" style={{ margin: '6px 0 0' }}>A {money0(1245000)} receipt for a farm-supply business. The source ERP says {money0(12450)}: the migrated amount is exactly ×100, and batch MIG-0612 has a logged scale defect. <strong>Re-evaluated with the source amount, no rule fires.</strong></p>
              </Link>
              <Link to="/labs/aml" query={{ tab: 'case', case: s6.caseId }} className="card card-link tight">
                <div className="row between"><strong className="mono">Scenario B · {s6.caseId}</strong><Badge tone="red">Unresolved</Badge></div>
                <p className="small" style={{ margin: '6px 0 0' }}>Four cash deposits of $9,400–$9,900 at three branches in five days, then a $37,000 wire out. Live core data, no data issue, and no reply to the request for information. <strong>Escalation is supported; closure is blocked.</strong></p>
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
            <Link to="/status">Build status and limitations →</Link>
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
            <h3 style={{ fontSize: 15, marginBottom: 4 }}>What is real and what is simulated</h3>
            <p className="small">Employment history, skills, education and credentials come from Gabriel’s resume. The four labs are independent portfolio simulations on synthetic, seeded data. They are not client engagements, production banking or compliance systems, or reproductions of any employer’s or client’s software. See <Link to="/experience">Experience</Link> for the full breakdown.</p>
          </div>
        </div>
      </section>
    </>
  );
}
