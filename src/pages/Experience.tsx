import { useEffect } from 'react';
import { Link, navigate, useRoute } from '../router';
import { CREDENTIALS, EDUCATION, PROFILE, RESUMES, ROLES, SKILLS, SKILL_EVIDENCE } from '../content/profile';
import { Badge } from '../components/ui';

const TRACK_TONE: Record<string, string> = { 'ERP implementation': 'blue', 'ERP support': 'neutral', AML: 'teal', Data: 'violet', Architecture: 'amber', Teaching: 'green' };

export function Experience() {
  const section = useRoute().query.get('section');
  useEffect(() => {
    // ERP detail moved to its own page; keep old deep links working.
    if (section === 'erp-implementation' || section === 'industries') { navigate('/erp', section === 'industries' ? { section } : undefined, { replace: true }); return; }
    if (section) document.getElementById(section)?.scrollIntoView();
  }, [section]);
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">Experience</div>
          <h1>Career timeline</h1>
          <p className="lead">{PROFILE.summary}</p>
          <div className="row">
            <Link to="/erp" className="btn btn-primary">ERP implementation detail</Link>
            <Link to="/aml" className="btn btn-secondary">AML technology background</Link>
            {RESUMES.filter((r) => r.file).map((r) => <a key={r.id} href={r.file!} className="btn btn-secondary" download>{r.label} (PDF)</a>)}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="card" style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 20 }}>How to read this portfolio</h2>
            <p className="small muted">Five levels of evidence, kept separate on purpose.</p>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Level</th><th>What it covers</th><th>Where to see it</th></tr></thead>
                <tbody>
                  <tr><td><Badge tone="green">Employment</Badge></td><td>Employers, job titles and dates, exactly as on the resume.</td><td>Timeline below</td></tr>
                  <tr><td><Badge tone="green">Responsibilities</Badge></td><td>What the resume says Gabriel did in each role: ERP implementation and consulting, enterprise ERP support, and AML-related transaction reviews and KYC-related checks. Client names are withheld.</td><td>Timeline below</td></tr>
                  <tr><td><Badge tone="amber">Portfolio projects</Badge></td><td>Four independent labs on synthetic data. They are not client work, production systems, or software approved for regulatory use.</td><td><Link to="/labs">Projects</Link></td></tr>
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
