import { useEffect } from 'react';
import { Link, useRoute } from '../router';
import { ENGAGEMENT_TYPES, ERP_CAPABILITIES, ERP_FUNCTIONS, ERP_PLATFORMS, INDUSTRIES, LED_ENGAGEMENTS, PUBLIC_CLIENTS, resumeFor } from '../content/profile';
import { Badge } from '../components/ui';

const KIND_TONE: Record<string, string> = { 'Implementation & consulting': 'blue', 'Implementation support': 'blue', 'Enterprise support': 'neutral', Training: 'neutral' };

/** ERP & Financial Systems track: professional experience only (no simulations), then related demos. */
export function Erp() {
  const section = useRoute().query.get('section');
  useEffect(() => { if (section) document.getElementById(section)?.scrollIntoView(); }, [section]);
  const erp = resumeFor('erp');
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">Career track · ERP & financial systems</div>
          <h1>ERP implementation & financial systems</h1>
          <p className="lead">Implementation Lead for an approximately 18-month, phased Sage 300 implementation at Softcodes International. Led the Sage X3 finance workstream on each Panni client implementation. Now Senior Support Engineer at Acumatica, investigating complex finance, commerce and integration issues.</p>
          <div className="row">
            <a href={erp.file} className="btn btn-primary" download>{erp.label} (PDF)</a>
            <Link to="/case-studies" query={{ study: 'erp' }} className="btn btn-secondary">ERP case study</Link>
            <Link to="/experience" className="btn btn-secondary">Full career timeline</Link>
          </div>
          <p className="small" style={{ color: 'var(--navy-muted)', margin: '12px 0 0' }}>Professional experience. Project examples are anonymised: clients are described by sector and location rather than by name.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <section id="erp-implementation" className="stack" style={{ marginBottom: 28, scrollMarginTop: 80 }} aria-labelledby="erp-h">
            {LED_ENGAGEMENTS.filter((e) => e.featured).map((e) => (
              <div key={e.role + e.client} className="card featured-engagement" aria-label="Featured engagement">
                <div className="row" style={{ gap: 6, marginBottom: 6 }}><Badge tone="blue">Featured project · led implementation</Badge><Badge tone="green">Professional experience · anonymised</Badge></div>
                <h3>{e.role}</h3>
                <p className="small"><strong>Client:</strong> {e.publicName ?? e.client} · <strong>Employer:</strong> {e.employer}{e.duration && <> · <strong>Duration:</strong> {e.duration}</>}{e.delivery && <> · <strong>Delivery:</strong> {e.delivery}</>}</p>
                <p className="small">{e.summary}{e.scope && <> <strong>Scope:</strong> {e.scope}</>}</p>
                <ul className="small" style={{ paddingLeft: 18 }}>{e.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul>
              </div>
            ))}
            <div className="card">
              <h3>Types of ERP work</h3>
              <p className="small muted">Implementations, integrations, upgrades and support are listed separately. Only the project marked “Led implementation” is presented as an implementation Gabriel led.</p>
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th>Type</th><th>Examples</th><th>Gabriel’s role</th><th>Where</th></tr></thead>
                  <tbody>{ENGAGEMENT_TYPES.map((t) => <tr key={t.type}><td><strong>{t.type}</strong></td><td className="small">{t.examples}</td><td className="small">{t.role}</td><td className="small">{t.where}</td></tr>)}</tbody>
                </table>
              </div>
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
              <p className="small muted">Eight areas of ERP work across Sage 300, Sage X3 and Acumatica, each with the role that evidences it. Where Gabriel led the work, it says so; elsewhere his responsibility varied by engagement.</p>
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
            <p className="small muted">{INDUSTRIES.length} industries, listed separately from the types of projects delivered (see “Types of ERP work” above). An industry appearing here does not mean a full implementation was delivered in it.</p>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Industry</th><th>Context</th><th>Where</th></tr></thead>
                <tbody>{INDUSTRIES.map((i) => <tr key={i.industry}><td><strong>{i.industry}</strong></td><td className="small">{i.context}</td><td className="small">{i.where}</td></tr>)}</tbody>
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


          <section className="card" aria-labelledby="erp-demos">
            <h2 id="erp-demos" style={{ fontSize: 20 }}>Related technical demonstrations <span className="badge badge-sim" style={{ marginLeft: 6 }}>Simulation</span></h2>
            <p className="small muted">Independent portfolio projects on synthetic data, not client work.</p>
            <div className="grid cols-2">
              <Link to="/labs/reconciliation" className="card card-link tight"><strong>ERP reconciliation & migration integrity</strong><p className="small muted" style={{ margin: '4px 0 0' }}>Source-to-target matching, root-cause tracing and audited corrections.</p></Link>
              <Link to="/labs/payments" className="card card-link tight"><strong>Payment API ↔ ERP integration</strong><p className="small muted" style={{ margin: '4px 0 0' }}>Idempotency, retries, timeouts and bank-to-ERP reconciliation.</p></Link>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
