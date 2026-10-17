import { useEffect } from 'react';
import { Link, useRoute } from '../router';
import { CREDENTIALS, EDUCATION, ERP_CAPABILITIES, ERP_FUNCTIONS, ERP_PLATFORMS, INDUSTRIES, PROFILE, PUBLIC_CLIENTS, ROLES, SKILLS, SKILL_EVIDENCE } from '../content/profile';
import { Badge } from '../components/ui';

const TRACK_TONE: Record<string, string> = { 'ERP implementation': 'blue', 'ERP support': 'neutral', AML: 'teal', Data: 'violet', Architecture: 'amber' };
const KIND_TONE: Record<string, string> = { 'Implementation & consulting': 'blue', 'Implementation & advisory': 'blue', 'Implementation support': 'blue', 'Client projects (consulting)': 'teal', 'Client engagements': 'teal', 'Integration project': 'violet', 'Enterprise support': 'neutral', 'In-house IT': 'neutral', Training: 'neutral' };

export function Experience() {
  const section = useRoute().query.get('section');
  useEffect(() => { if (section) document.getElementById(section)?.scrollIntoView(); }, [section]);
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">Experience</div>
          <h1>Career timeline</h1>
          <p className="lead">{PROFILE.summary}</p>
          <a href={PROFILE.resumePdf} className="btn btn-secondary" download>Download resume (PDF)</a>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <section id="erp-implementation" className="stack" style={{ marginBottom: 28, scrollMarginTop: 80 }} aria-labelledby="erp-h">
            <div>
              <div className="eyebrow">Professional experience</div>
              <h2 id="erp-h">ERP implementation & consulting experience</h2>
              <p className="lead" style={{ maxWidth: 820 }}>Five years of Sage X3 and Sage 300 implementation and consulting at Softcodes International, a year supporting Sage X3 implementations at Panni Management & Technology, and three years resolving complex enterprise ERP issues at Acumatica. Client names are confidential and are not shown.</p>
            </div>
            <div className="card">
              <h3>Platforms</h3>
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th>Platform</th><th>Type of work</th><th>What it covered</th><th>Where</th></tr></thead>
                  <tbody>{ERP_PLATFORMS.map((p) => <tr key={p.platform}><td><strong>{p.platform}</strong></td><td><Badge tone={KIND_TONE[p.kind]}>{p.kind}</Badge></td><td className="small">{p.work}</td><td className="small">{p.where}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
            <div className="card">
              <h3>Capability areas</h3>
              <p className="small muted">Eight areas of ERP work across Sage X3, Sage 300 and Acumatica, each with the role that evidences it. Gabriel’s responsibility varied by engagement; the site does not attach clients or outcomes to these areas.</p>
              <ol className="lifecycle">
                {ERP_CAPABILITIES.map((c) => (
                  <li key={c.area}><strong>{c.area}</strong><span>{c.what}</span><small className="muted">{c.evidence}</small>{c.clients.length > 0 && <small>Clients: {c.clients.join(', ')}</small>}</li>
                ))}
              </ol>
            </div>
            <div className="card">
              <h3>Business functions</h3>
              <div className="row" style={{ gap: 6 }}>{ERP_FUNCTIONS.map((f) => <Badge key={f} tone="blue">{f}</Badge>)}</div>
            </div>
          </section>

          <section id="industries" className="card" style={{ marginBottom: 28, scrollMarginTop: 80 }} aria-labelledby="ind-h">
            <h2 id="ind-h" style={{ fontSize: 22 }}>Industry experience</h2>
            <p className="small muted">{INDUSTRIES.length} industries across client engagements, enterprise support and in-house roles. Each is labelled with the kind of involvement Gabriel’s resume and statements support. Implementation is claimed only where the resume states it; not every industry listed was an implementation project.</p>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Industry</th><th>Type of involvement</th><th>What it involved</th><th>Where</th></tr></thead>
                <tbody>{INDUSTRIES.map((i) => <tr key={i.industry}><td><strong>{i.industry}</strong></td><td><Badge tone={KIND_TONE[i.kind]}>{i.kind}</Badge></td><td className="small">{i.involvement}</td><td className="small">{i.where}</td></tr>)}</tbody>
              </table>
            </div>
          </section>

          {PUBLIC_CLIENTS.length > 0 && (
            <section className="card" style={{ marginBottom: 28 }} aria-labelledby="clients-h">
              <h2 id="clients-h" style={{ fontSize: 20 }}>Selected client organisations</h2>
              <p className="small muted">Organisations Gabriel worked with, shown with permission. Listing a name does not mean Gabriel led a full implementation for it.</p>
              <ul className="small">{PUBLIC_CLIENTS.map((c) => <li key={c.name}><strong>{c.name}</strong> · {c.industry} · via {c.employer}</li>)}</ul>
            </section>
          )}

          <div className="card" style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 20 }}>How to read this portfolio</h2>
            <p className="small muted">Five levels of evidence, kept separate on purpose.</p>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Level</th><th>What it covers</th><th>Where to see it</th></tr></thead>
                <tbody>
                  <tr><td><Badge tone="green">Employment</Badge></td><td>Employers, job titles and dates, exactly as on the resume.</td><td>Timeline below</td></tr>
                  <tr><td><Badge tone="green">Responsibilities</Badge></td><td>What the resume says Gabriel did in each role: ERP implementation and consulting, enterprise ERP support, and AML-related transaction reviews and KYC-related checks. Client names are withheld.</td><td>Timeline below</td></tr>
                  <tr><td><Badge tone="amber">Portfolio projects</Badge></td><td>Four independent labs on synthetic data. They are not client work, production systems, or software approved for regulatory use.</td><td><Link to="/labs">Project lab</Link></td></tr>
                  <tr><td><Badge tone="blue">Demonstrated skills</Badge></td><td>Rule design, alert investigation workflow, source-to-target reconciliation, SQL, idempotent API design, data-quality pipelines. Behaviour is checked by automated tests.</td><td><Link to="/status">Build status</Link></td></tr>
                  <tr><td><Badge tone="neutral">Not claimed</Badge></td><td>Filing regulatory reports (e.g. FINTRAC STRs or LCTRs), hands-on use of vendor AML platforms or sanctions screening tools, AML certifications such as CAMS, production cloud architecture. These would need further study or professional validation.</td><td>—</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="split wide-left">
            <div className="timeline" aria-label="Employment history">
              {ROLES.map((r) => (
                <article key={r.title + r.org} className="timeline-item">
                  <h3>{r.title}</h3>
                  <div className="meta">{r.org} · {r.place} · {r.start} – {r.end}</div>
                  <div className="row" style={{ gap: 6, marginBottom: 8 }}>{r.tracks.map((t) => <Badge key={t} tone={TRACK_TONE[t]}>{t}</Badge>)}</div>
                  <ul>{r.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
                </article>
              ))}
            </div>
            <aside className="stack">
              <div className="card">
                <h3>Education</h3>
                {EDUCATION.map((e) => (
                  <p key={e.credential} className="small"><strong>{e.credential}</strong><br />{e.school} · {e.years}</p>
                ))}
              </div>
              <div className="card">
                <h3>Training, credentials & badges</h3>
                <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>{CREDENTIALS.map((c) => <li key={c}>{c}</li>)}</ul>
                <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>No AML professional certification (e.g. CAMS) is claimed.</p>
              </div>
              <div className="card">
                <h3>Technical skills</h3>
                {Object.entries(SKILLS).map(([k, v]) => (
                  <div key={k} style={{ marginBottom: 10 }}>
                    <div className="small" style={{ fontWeight: 600 }}>{k}</div>
                    <div className="small muted">{v.join(' · ')}</div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div><div className="eyebrow">Skill evidence</div><h2>Where each skill was used — and where you can see it</h2></div>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Skill</th><th>Professional experience (resume)</th><th>Portfolio demonstration (synthetic)</th></tr></thead>
              <tbody>
                {SKILL_EVIDENCE.map((s) => (
                  <tr key={s.skill}>
                    <td><strong>{s.skill}</strong></td>
                    <td>{s.professional}</td>
                    <td><Link to={s.demoLink}>{s.demo}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
