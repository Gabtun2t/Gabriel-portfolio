import { Link } from '../router';
import { PROFILE } from '../content/profile';

export function Contact() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">Resume & contact</div>
          <h1>Get in touch</h1>
          <p className="lead">For roles in AML and financial-crime technology, ERP and financial systems, financial data engineering, or solution and integration architecture, email is the best way to reach Gabriel.</p>
        </div>
      </section>
      <section className="section">
        <div className="container grid cols-2">
          <div className="card stack">
            <h2 style={{ fontSize: 22 }}>Resume</h2>
            <p className="muted">Two-page PDF. The web copy omits the phone number; ask by email if you need it.</p>
            <div className="row">
              <a className="btn btn-primary" href={PROFILE.resumePdf} download>Download PDF</a>
              <a className="btn btn-secondary" href={PROFILE.resumePdf} target="_blank" rel="noopener">Open in a new tab</a>
            </div>
          </div>
          <div className="card stack">
            <h2 style={{ fontSize: 22 }}>Contact</h2>
            <dl className="dl">
              <dt>Email</dt><dd><a href={`mailto:${PROFILE.email}?subject=${encodeURIComponent('Opportunity — via your portfolio')}`}>{PROFILE.email}</a></dd>
              <dt>Location</dt><dd>{PROFILE.location}</dd>
              {PROFILE.linkedinUrl && <><dt>LinkedIn</dt><dd><a href={PROFILE.linkedinUrl} target="_blank" rel="noopener noreferrer">{PROFILE.linkedinUrl.replace(/^https?:\/\/(www\.)?/, '')}</a></dd></>}
            </dl>
            <a className="btn btn-secondary" href={`mailto:${PROFILE.email}?subject=${encodeURIComponent('Opportunity — via your portfolio')}`}>Email Gabriel</a>
          </div>
        </div>
        <div className="container" style={{ marginTop: 20 }}>
          <p className="small muted">Hiring for a specific track? The <Link to="/guide">recruiter guide</Link> lists what to look at in five minutes.</p>
        </div>
      </section>
    </>
  );
}
