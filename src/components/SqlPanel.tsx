import { useState } from 'react';
import snapshot from '../generated/sql_snapshot.json';
import { CodeBlock } from './ui';

type Snap = { sqlite_version: string; files: Record<string, Record<string, { title: string; sql: string; columns: string[]; rows: (string | number | null)[][] }>> };
const SNAP = snapshot as unknown as Snap;

/**
 * Shows SQL queries together with the result SQLite actually returned for the seeded data.
 * Results are produced by scripts/check_sql.py (not typed in by hand).
 */
export function SqlPanel({ file, intro, only }: { file: string; intro?: string; only?: string[] }) {
  const queries = Object.entries(SNAP.files[file] ?? {}).filter(([id]) => !only || only.includes(id));
  const [active, setActive] = useState(queries[0]?.[0]);
  const q = queries.find(([id]) => id === active)?.[1];
  if (!queries.length) return <div className="empty">SQL snapshot not found — run <span className="mono">npm run test:sql</span>.</div>;
  return (
    <div className="card">
      <div className="row between">
        <h3 style={{ margin: 0 }}>SQL — <span className="mono">sql/{file}</span></h3>
        <a className="btn btn-secondary btn-sm" href="data/seed_sqlite.sql" download>Download seed_sqlite.sql</a>
      </div>
      {intro && <p className="small muted" style={{ marginTop: 6 }}>{intro}</p>}
      <div className="field" style={{ maxWidth: 520, margin: '10px 0' }}>
        <label htmlFor={`sql-${file}`}>Query</label>
        <select id={`sql-${file}`} value={active} onChange={(e) => setActive(e.target.value)}>
          {queries.map(([id, v]) => <option key={id} value={id}>{v.title}</option>)}
        </select>
      </div>
      {q && (
        <div className="stack">
          <CodeBlock lang="sql" title={`${active}.sql`} code={q.sql} maxHeight={340} />
          <div className="small muted">Result returned by SQLite {SNAP.sqlite_version} on the seeded data ({q.rows.length} row{q.rows.length === 1 ? '' : 's'}{q.rows.length > 15 ? ', first 15 shown' : ''}):</div>
          <div className="table-wrap">
            <table className="data compact">
              <thead><tr>{q.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {q.rows.slice(0, 15).map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className={typeof v === 'number' ? 'num mono' : 'mono small'}>{v === null ? 'NULL' : String(v)}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
          <p className="small muted" style={{ margin: 0 }}>Reproduce locally: <span className="mono">sqlite3 demo.db &lt; data/seed_sqlite.sql</span>, then run the file. <span className="mono">npm run test:sql</span> re-executes every query and checks parity with the TypeScript engine.</p>
        </div>
      )}
    </div>
  );
}
