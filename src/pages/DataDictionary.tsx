import { DATA_DICTIONARY } from '../content/dataDictionary';
import { SimBanner } from '../components/ui';

export function DataDictionary() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">Data</div>
          <h1>Data dictionary & seeds</h1>
          <p className="lead">Every table used by the labs, its grain, the seed that generates it, and what each column means. Download everything as CSV or a single SQLite load script.</p>
          <div className="row">
            <a className="btn btn-primary" href="data/seed_sqlite.sql" download>Download seed_sqlite.sql</a>
          </div>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container stack">
          <SimBanner>All rows are fictional. Regenerate them with <span className="mono">npm run seed</span>; identical seeds produce identical data (asserted by tests).</SimBanner>
          {DATA_DICTIONARY.map((t) => (
            <div key={t.table} className="card">
              <div className="row between">
                <h3 className="mono" style={{ margin: 0 }}>{t.table}</h3>
                <span className="small muted">{t.lab} · {t.seed}</span>
              </div>
              <p className="small muted">{t.grain}{!t.table.includes(' ') && <> · <a href={`data/${t.table}.csv`} download>{t.table}.csv</a></>}</p>
              <div className="table-wrap">
                <table className="data compact">
                  <thead><tr><th>Column</th><th>Type</th><th>Description</th></tr></thead>
                  <tbody>{t.columns.map(([n, ty, d]) => <tr key={n}><td className="mono small">{n}</td><td className="small muted">{ty}</td><td className="small">{d}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
