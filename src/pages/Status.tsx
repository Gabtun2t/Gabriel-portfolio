import { StatusPill } from '../components/ui';
import { DEPLOYMENT, FEATURE_STATUS, KNOWN_LIMITATIONS } from '../content/status';

export function Status() {
  const groups: ('Implemented' | 'Partial' | 'Planned')[] = ['Implemented', 'Partial', 'Planned'];
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">Transparency</div>
          <h1>Build status</h1>
          <p className="lead">Where the site is deployed, which build you are looking at, what is implemented, partial or planned, and the known limitations.</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container stack">
          <div className="card">
            <h2 style={{ fontSize: 20 }}>Deployment</h2>
            <dl className="dl">
              <dt>Platform</dt><dd>{DEPLOYMENT.platform}</dd>
              <dt>Public URL</dt><dd><a href={DEPLOYMENT.url}>{DEPLOYMENT.url}</a></dd>
              <dt>Source</dt><dd><a href={DEPLOYMENT.repository} target="_blank" rel="noopener noreferrer">{DEPLOYMENT.repository.replace('https://', '')}</a></dd>
              <dt>This build</dt><dd><span className="mono">commit {__BUILD_SHA__}</span> · built {__BUILT_AT__.replace('T', ' ').slice(0, 16)} UTC · {__BUILD_SOURCE__}</dd>
              <dt>Pipeline</dt><dd>{DEPLOYMENT.pipeline} <a href={DEPLOYMENT.workflowRuns} target="_blank" rel="noopener noreferrer">Workflow runs</a></dd>
              <dt>Last verified live</dt><dd>{DEPLOYMENT.lastVerified ? `${DEPLOYMENT.lastVerified.date} · commit ${DEPLOYMENT.lastVerified.commit} · ${DEPLOYMENT.lastVerified.how}` : 'Not yet recorded for this release.'}</dd>
            </dl>
            <p className="small muted" style={{ margin: '10px 0 0' }}>Build details come from the build itself, not from hand-written text.</p>
          </div>
          {groups.map((g) => (
            <div key={g} className="card">
              <div className="row between"><h2 style={{ fontSize: 20, margin: 0 }}>{g === 'Planned' ? 'Planned enhancements' : g === 'Partial' ? 'Partially implemented' : 'Implemented'}</h2><StatusPill status={g} /></div>
              <div className="table-wrap" style={{ marginTop: 10 }}>
                <table className="data">
                  <thead><tr><th>Area</th><th>Feature</th><th>Verified by</th><th>Notes</th></tr></thead>
                  <tbody>{FEATURE_STATUS.filter((f) => f.status === g).map((f) => <tr key={f.feature}><td className="small">{f.area}</td><td>{f.feature}</td><td className="small">{f.tested}</td><td className="small muted">{f.note ?? ''}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          ))}
          <div className="card">
            <h2 style={{ fontSize: 20 }}>Known limitations</h2>
            <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>{KNOWN_LIMITATIONS.map((l) => <li key={l}>{l}</li>)}</ul>
          </div>
          <p className="small muted">Commands: <span className="mono">npm test</span> (unit tests) · <span className="mono">npm run test:sql</span> (SQL parity on SQLite) · <span className="mono">npm run test:e2e</span> (browser test).</p>
        </div>
      </section>
    </>
  );
}
