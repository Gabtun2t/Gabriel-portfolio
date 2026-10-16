import { StatusPill } from '../components/ui';
import { FEATURE_STATUS } from '../content/status';



export function Status() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">Transparency</div>
          <h1>Build status</h1>
          <p className="lead">What is implemented, partially implemented or planned — and how each part is tested.</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Area</th><th>Feature</th><th>Status</th><th>Verified by</th><th>Notes</th></tr></thead>
              <tbody>{FEATURE_STATUS.map((f) => <tr key={f.feature}><td className="small">{f.area}</td><td>{f.feature}</td><td><StatusPill status={f.status} /></td><td className="small">{f.tested}</td><td className="small muted">{f.note ?? ''}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="small muted" style={{ marginTop: 12 }}>Commands: <span className="mono">npm test</span> (engine unit tests) · <span className="mono">npm run test:sql</span> (SQL parity on SQLite) · <span className="mono">npm run test:e2e</span> (browser smoke test).</p>
        </div>
      </section>
    </>
  );
}
