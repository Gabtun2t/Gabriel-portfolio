import { Link } from '../router';
import { CREDENTIALS, EDUCATION, PROFILE, ROLES, SKILLS, SKILL_EVIDENCE } from '../content/profile';
import { Badge } from '../components/ui';

const TRACK_TONE: Record<string, string> = { AML: 'teal', ERP: 'blue', Data: 'violet', Architecture: 'amber' };

export function Experience() {
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
          <div className="callout info" style={{ marginBottom: 28 }}>
            <h4>Professional work vs. portfolio demonstrations</h4>
            <p className="small">Everything on this page is professional history taken from the resume. The labs elsewhere on this site are synthetic demonstrations; they are mapped to this experience in the “skill evidence” table below but are not client work. Client names are withheld.</p>
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
