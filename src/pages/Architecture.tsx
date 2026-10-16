import { Link } from '../router';
import { Diagram } from '../components/Diagram';

export function Architecture() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">Architecture</div>
          <h1>Integration, reconciliation and data-flow designs</h1>
          <p className="lead">How the labs fit together, and the reference designs they illustrate. Diagrams describe the portfolio’s simulated systems.</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container stack">
          <div className="card">
            <h2>1. End-to-end: from migration defect to AML alert</h2>
            <p className="muted">The signature story. A legacy ledger is migrated into an ERP; monitoring reads from the migrated ledger; reconciliation evidence flows back into the investigation.</p>
            <Diagram label="Legacy core to migration batches to ERP ledger to transaction monitoring to case investigation, with reconciliation feeding evidence back" width={1000} height={320}
              nodes={[
                { id: 'leg', x: 10, y: 30, w: 150, title: 'Legacy core', sub: 'history (source of truth)' },
                { id: 'stg', x: 215, y: 30, w: 160, title: 'Staging & mapping', sub: 'map v1.2/v1.3, reject log' },
                { id: 'erp', x: 430, y: 30, w: 160, title: 'ERP ledger', sub: 'MIG-0611 / MIG-0612', tone: 'warn' },
                { id: 'live', x: 650, y: 30, w: 160, title: 'Live core feed', sub: 'June onwards' },
                { id: 'tm', x: 650, y: 150, w: 160, title: 'Transaction monitoring', sub: '7 rules → alerts', tone: 'accent' },
                { id: 'case', x: 850, y: 150, w: 140, title: 'Case investigation', sub: 'evidence → decision', tone: 'accent' },
                { id: 'rec', x: 320, y: 250, w: 170, title: 'Reconciliation', sub: 'M0–M5, root cause', tone: 'warn' },
              ]}
              edges={[
                { from: 'leg', to: 'stg', label: 'extract' },
                { from: 'stg', to: 'erp', label: 'load' },
                { from: 'erp', to: 'tm', label: 'Apr–May', fromSide: 'r', toSide: 'l' },
                { from: 'live', to: 'tm', fromSide: 'b', toSide: 't' },
                { from: 'tm', to: 'case', tone: 'accent' },
                { from: 'leg', to: 'rec', fromSide: 'b', toSide: 'l', label: 'source' },
                { from: 'erp', to: 'rec', fromSide: 'b', toSide: 'r', label: 'target' },
                { from: 'rec', to: 'case', fromSide: 'r', toSide: 'b', tone: 'warn', label: 'recon report = evidence' },
              ]} />
            <div className="grid cols-3" style={{ marginTop: 12 }}>
              <div><h4>Control points</h4><p className="small muted">Staging reject log, load-run IDs, mapping version and source-document amounts are the lineage that lets an investigator say “this is the data, not the customer”.</p></div>
              <div><h4>Failure mode prevented</h4><p className="small muted">Closing a genuine alert as a “data issue” without proof. Closure requires documents that explain every triggered rule.</p></div>
              <div><h4>See it</h4><p className="small"><Link to="/labs/aml">AML lab</Link> · <Link to="/labs/reconciliation">Reconciliation lab</Link></p></div>
            </div>
          </div>

          <div className="card">
            <h2>2. Reconciliation & migration-integrity flow</h2>
            <Diagram label="Reconciliation flow: normalize, key match, fuzzy match, classify, root cause, correction journal, re-run" width={1000} height={160}
              nodes={[
                { id: 'n', x: 10, y: 50, w: 120, title: 'Normalize', sub: 'M0' },
                { id: 'k', x: 160, y: 50, w: 130, title: 'Key match', sub: 'M1 + dup M3' },
                { id: 'f', x: 320, y: 50, w: 120, title: 'Fuzzy match', sub: 'M2' },
                { id: 'c', x: 470, y: 50, w: 120, title: 'Classify', sub: 'M4 / M5' },
                { id: 'r', x: 620, y: 50, w: 120, title: 'Root cause', sub: 'pattern + lineage', tone: 'warn' },
                { id: 'j', x: 770, y: 50, w: 100, title: 'Correct', sub: 'journal', tone: 'accent' },
                { id: 'v', x: 900, y: 50, w: 90, title: 'Re-run', sub: 'validate' },
              ]}
              edges={[{ from: 'n', to: 'k' }, { from: 'k', to: 'f' }, { from: 'f', to: 'c' }, { from: 'c', to: 'r' }, { from: 'r', to: 'j' }, { from: 'j', to: 'v' }, { from: 'v', to: 'k', fromSide: 'b', toSide: 'b', tone: 'accent', label: 'until only human-review items remain' }]} />
          </div>

          <div className="card">
            <h2>3. Payment API ↔ ERP sequence</h2>
            <Diagram label="Sequence: ERP sends payment, integration validates and derives key, bank times out after commit, retry with same key returns original result, ERP confirmed, statement reconciled" width={1000} height={230}
              nodes={[
                { id: 'a', x: 10, y: 20, w: 150, title: '1 · ERP AP', sub: 'approve AP-PMT-000418' },
                { id: 'b', x: 200, y: 20, w: 165, title: '2 · Validate + key', sub: 'idem_… from ERP ref', tone: 'accent' },
                { id: 'c', x: 405, y: 20, w: 160, title: '3 · POST → bank', sub: 'commit, response lost', tone: 'warn' },
                { id: 'd', x: 625, y: 20, w: 160, title: '4 · Back-off, retry', sub: 'same key', tone: 'accent' },
                { id: 'e', x: 830, y: 20, w: 160, title: '5 · 201 replayed', sub: 'no second debit' },
                { id: 'f', x: 830, y: 160, w: 160, title: '6 · ERP CONFIRMED', sub: 'bank ref stored' },
                { id: 'g', x: 625, y: 160, w: 160, title: '7 · Reconcile', sub: 'statement ↔ ERP: 1 debit', tone: 'warn' },
              ]}
              edges={[{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'd', tone: 'warn', label: 'timeout' }, { from: 'd', to: 'e' }, { from: 'e', to: 'f', fromSide: 'b', toSide: 't' }, { from: 'f', to: 'g', fromSide: 'l', toSide: 'r' }]} />
            <p className="small muted">Details and security notes: <Link to="/labs/payments">payment API lab</Link>.</p>
          </div>

          <div className="card">
            <h2>4. Financial data pipeline</h2>
            <Diagram label="Pipeline: three sources to standardize, validate with quarantine, deduplicate, model, metrics and dashboard" width={1000} height={250}
              nodes={[
                { id: 's1', x: 10, y: 10, w: 150, title: 'Card settlement', sub: 'ISO, decimals' },
                { id: 's2', x: 10, y: 90, w: 150, title: 'EFT receipts', sub: 'cents, CAD/USD' },
                { id: 's3', x: 10, y: 170, w: 150, title: 'ERP AR export', sub: 'DD/MM/YYYY' },
                { id: 'st', x: 210, y: 90, w: 130, title: 'Standardize', sub: 'canonical shape' },
                { id: 'va', x: 380, y: 90, w: 120, title: 'Validate', sub: 'V1–V5', tone: 'accent' },
                { id: 'q', x: 380, y: 190, w: 120, title: 'Quarantine', sub: 'with reasons', tone: 'warn' },
                { id: 'dd', x: 540, y: 90, w: 120, title: 'Deduplicate', sub: 'D1 exact, D2 key' },
                { id: 'mo', x: 700, y: 90, w: 130, title: 'Star schema', sub: 'fact + dims' },
                { id: 'me', x: 870, y: 90, w: 120, title: 'Metrics', sub: 'volume, DQ', tone: 'accent' },
              ]}
              edges={[{ from: 's1', to: 'st', fromSide: 'r', toSide: 'l' }, { from: 's2', to: 'st' }, { from: 's3', to: 'st', fromSide: 'r', toSide: 'l' }, { from: 'st', to: 'va' }, { from: 'va', to: 'q', fromSide: 'b', toSide: 't', tone: 'warn' }, { from: 'va', to: 'dd' }, { from: 'dd', to: 'mo' }, { from: 'mo', to: 'me' }]} />
          </div>

          <div className="card">
            <h2>5. How this website is built</h2>
            <div className="grid cols-2">
              <div>
                <ul className="small" style={{ paddingLeft: 18 }}>
                  <li><strong>Static single-page app</strong> (React + TypeScript, bundled by esbuild). No server, database or secrets — hosts free on GitHub Pages, Netlify or Vercel.</li>
                  <li><strong>Engines are plain TypeScript modules</strong> (<span className="mono">src/engine/*</span>), independent of the UI and covered by Node’s built-in test runner.</li>
                  <li><strong>Seeded generators</strong> (<span className="mono">src/data/*</span>) recreate identical data in the browser and in tests; <span className="mono">npm run seed</span> exports CSV and a SQLite script.</li>
                  <li><strong>SQL parity</strong>: <span className="mono">scripts/check_sql.py</span> runs the SQL files on SQLite and asserts the same results as the TypeScript engines; its output is what the site displays.</li>
                  <li><strong>Inspectable code</strong>: rule and matcher code on the pages is imported from the running source files, not copied.</li>
                </ul>
              </div>
              <div>
                <h4>Why not a backend?</h4>
                <p className="small muted">A server would add hosting cost, cold starts and a security surface, for data that is synthetic and small. Running everything client-side keeps the demo free, fast and fully reproducible. The trade-off: no shared state between visitors and no server-side SQL console. A FastAPI/Postgres service is a natural next step if the labs ever need real persistence.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
