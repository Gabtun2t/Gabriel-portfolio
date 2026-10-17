import { useMemo, useState } from 'react';
import { pipeline } from '../data/instances';
import { PIPELINE_SEED, type SourceName } from '../data/pipeline/generate';
import { VALIDATION_RULES, runPipeline, sourceControls, standardize, traceFact, type ValidationRuleId } from '../engine/pipeline/pipeline';
import { LabBrief } from '../components/LabBrief';
import { Badge, CodeBlock, Kpi, SimBanner, extractBlock } from '../components/ui';
import { ColumnChart, HBarChart } from '../components/charts';
import { Diagram } from '../components/Diagram';
import { SqlPanel } from '../components/SqlPanel';
import { money, money0, pct } from '../lib/format';
import pipelineSrc from '../engine/pipeline/pipeline.ts?raw';

type Stage = 'Ingest' | 'Standardize' | 'Validate' | 'Deduplicate' | 'Model';
const SOURCES: { id: SourceName; label: string; shape: string }[] = [
  { id: 'card_settlement', label: 'Card settlement file', shape: 'ISO timestamps · decimal amounts · merchant IDs' },
  { id: 'eft_receipts', label: 'EFT receipts feed', shape: 'ISO dates · amounts in cents · payer accounts · CAD/USD' },
  { id: 'erp_ar_receipts', label: 'ERP AR receipts export', shape: 'DD/MM/YYYY dates · decimal amounts · ERP customer codes' },
];

export function DataLab() {
  const { raw } = pipeline();
  const [enabled, setEnabled] = useState<Set<ValidationRuleId>>(new Set(VALIDATION_RULES.map((v) => v.id)));
  const [stage, setStage] = useState<Stage>('Validate');
  const [src, setSrc] = useState<SourceName>('erp_ar_receipts');
  const run = useMemo(() => runPipeline(raw, enabled), [raw, enabled]);
  const mergedFacts = run.facts.filter((f) => f.lineageRawIds.length > 1);
  const [traceKey, setTraceKey] = useState(mergedFacts[0]?.paymentKey ?? run.facts[0].paymentKey);
  const trace = traceFact(run, raw, traceKey);
  const months = [...new Set(run.metrics.monthlyByChannel.map((m) => m.month))];
  const channels = [...new Set(run.metrics.monthlyByChannel.map((m) => m.channel))];
  const dqAvg = (run.metrics.dq.completeness + run.metrics.dq.validity + run.metrics.dq.uniqueness + run.metrics.dq.integrity) / 4;
  const maxRows = run.counts[0].rows;
  const controls = sourceControls(run, raw);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">Lab 4</div>
          <h1>Financial data engineering & analytics lab</h1>
          <p className="lead">Three payment feeds in three different shapes go through ingestion, standardization, validation with quarantine, deduplication, a star-schema model and computed metrics. Every fact row can be traced back to the raw records it came from.</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container stack">
          <SimBanner>Synthetic raw deliveries generated from seed {PIPELINE_SEED}, including 26 seeded quality problems. The pipeline runs in your browser; toggling a rule re-runs it.</SimBanner>
          <LabBrief
            problem="Payment data arrives from three systems that disagree on date formats, units and identifiers, and sometimes the same file arrives twice. Reports built straight on that data are wrong in ways nobody notices."
            why="Finance, treasury and monitoring all depend on these numbers. A silently dropped currency or a double-counted file changes totals without any visible error."
            proves="That Gabriel can build a small, honest pipeline: standardize, validate with reasons, quarantine rather than drop, deduplicate, model, measure quality, prove every row is accounted for, and trace any number back to its source."
            capabilities={['Ingestion of three source formats', 'Required-field and validity checks with quarantine', 'Exact and natural-key deduplication', 'Currency conversion and star-schema model', 'Data-quality dimensions and row-count controls', 'Lineage from fact row to raw delivery; SQL over the model']}
            findings={[
              <>{raw.length} raw deliveries → {run.quarantined.length} quarantined, {run.dedup.exactDuplicates.length + run.dedup.keyDuplicates.length} duplicates removed, {run.facts.length} fact rows.</>,
              <>Row-count controls balance for {controls.filter((c) => c.balanced).length} of {controls.length} sources.</>,
              <>Turning off the currency rule lets {runPipeline(raw, new Set(VALIDATION_RULES.map((v) => v.id).filter((id) => id !== 'V4_CURRENCY'))).metrics.unconverted} rows through with no CAD amount, and the dashboard total does not change. That is why quality needs its own measure.</>,
            ]}
            limitations={['Batch, in-memory, single run', 'No orchestration, incremental loads or cloud infrastructure', 'Fixed monthly FX rates']}
            technical={<p>Each stage is a pure function in <span className="mono">src/engine/pipeline/pipeline.ts</span>, so a run is reproducible and every stage is unit-tested. Data-quality dimensions are measured over all staged rows with every rule, independent of the toggles. Fact rows carry <span className="mono">lineage_raw_ids</span>, and the monthly SQL over the star schema is checked against the TypeScript metrics.</p>}
          />
          <div className="kpis">
            <Kpi label="Raw deliveries" value={raw.length} sub="3 sources" />
            <Kpi label="Quarantined" value={run.quarantined.length} sub="failed ≥1 enabled rule" />
            <Kpi label="Duplicates removed" value={run.dedup.exactDuplicates.length + run.dedup.keyDuplicates.length} sub={`${run.dedup.exactDuplicates.length} exact · ${run.dedup.keyDuplicates.length} key`} />
            <Kpi label="fact_payment rows" value={run.facts.length} sub={run.metrics.unconverted ? `${run.metrics.unconverted} without CAD amount` : 'all converted to CAD'} />
            <Kpi label="Volume (CAD)" value={money0(run.metrics.totalCad)} sub="Apr–Jun 2026" />
            <Kpi label="Data quality (avg.)" value={pct(dqAvg)} sub="measured on all staged rows" />
          </div>

          <div className="split">
            <div className="card">
              <h3>Pipeline</h3>
              <div className="funnel" role="group" aria-label="Pipeline stages">
                {run.counts.map((c) => (
                  <button key={c.stage} className="funnel-step" aria-pressed={stage === c.stage} onClick={() => setStage(c.stage as Stage)}>
                    <span><strong>{c.stage}</strong><div className="small muted">{c.note}</div></span>
                    <span className="bar" style={{ width: `${(c.rows / maxRows) * 100}%` }} aria-hidden="true" />
                    <span className="n">{c.rows}</span>
                  </button>
                ))}
              </div>
              <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>Select a stage to inspect it. Row counts are recomputed on every run.</p>
            </div>
            <div className="card stack">
              {stage === 'Ingest' && (
                <>
                  <h3 style={{ margin: 0 }}>Ingest — raw deliveries</h3>
                  <SourcePicker value={src} onChange={setSrc} />
                  <p className="small muted">{SOURCES.find((s) => s.id === src)!.shape}. {raw.filter((r) => r.source === src).length} deliveries.</p>
                  <RawTable rows={raw.filter((r) => r.source === src).slice(-6)} />
                  <p className="small muted" style={{ margin: 0 }}>Showing the last six deliveries (where most seeded problems sit). Data arrives as strings, exactly as a CSV loader would see it.</p>
                </>
              )}
              {stage === 'Standardize' && (
                <>
                  <h3 style={{ margin: 0 }}>Standardize — one canonical shape</h3>
                  <SourcePicker value={src} onChange={setSrc} />
                  <div className="table-wrap">
                    <table className="data compact">
                      <thead><tr><th>Canonical field</th><th>card_settlement</th><th>eft_receipts</th><th>erp_ar_receipts</th></tr></thead>
                      <tbody>
                        <tr><td>txnDate</td><td className="mono small">txn_ts[0:10]</td><td className="mono small">value_date</td><td className="mono small">receipt_date DD/MM/YYYY → ISO</td></tr>
                        <tr><td>amount</td><td className="mono small">amount</td><td className="mono small">amount_cents ÷ 100</td><td className="mono small">amount</td></tr>
                        <tr><td>customerKey</td><td className="mono small">merchant_id → xref</td><td className="mono small">payer_account → xref</td><td className="mono small">customer_code → xref</td></tr>
                        <tr><td>naturalKey</td><td className="mono small">settlement_id</td><td className="mono small">trace_no</td><td className="mono small">doc_no</td></tr>
                      </tbody>
                    </table>
                  </div>
                  {(() => { const r = raw.filter((x) => x.source === src)[0]; return <div className="grid cols-2" style={{ gap: 10 }}><CodeBlock lang="json" title={`raw ${r.rawId}`} code={JSON.stringify(r.payload, null, 2)} /><CodeBlock lang="json" title="standardized" code={JSON.stringify(standardize(r), null, 2)} /></div>; })()}
                </>
              )}
              {stage === 'Validate' && (
                <>
                  <h3 style={{ margin: 0 }}>Validate — rules and quarantine</h3>
                  <p className="small muted" style={{ margin: 0 }}>Turn a rule off to see what would leak downstream.</p>
                  <div className="table-wrap">
                    <table className="data compact">
                      <thead><tr><th>Enabled</th><th>Rule</th><th>Dimension</th><th className="num">Failures</th></tr></thead>
                      <tbody>{VALIDATION_RULES.map((v) => (
                        <tr key={v.id}>
                          <td><input type="checkbox" aria-label={`Enable ${v.name}`} checked={enabled.has(v.id)} onChange={(e) => setEnabled((s) => { const n = new Set(s); if (e.target.checked) n.add(v.id); else n.delete(v.id); return n; })} /></td>
                          <td><span className="mono small">{v.id}</span><div className="small">{v.name}</div></td>
                          <td className="small">{v.dimension}</td>
                          <td className="num mono">{enabled.has(v.id) ? run.metrics.rejectionsByRule[v.id] : '—'}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                  {run.metrics.unconverted > 0 && <div className="callout warn"><p className="small"><strong>{run.metrics.unconverted} fact row(s) have no CAD amount</strong> because the currency rule is off. They are excluded from the dashboard totals — silently, unless someone measures it.</p></div>}
                  <div className="table-wrap" style={{ maxHeight: 300 }}>
                    <table className="data compact">
                      <thead><tr><th>Raw ID</th><th>Source</th><th>Failure(s)</th></tr></thead>
                      <tbody>{run.quarantined.map((q) => <tr key={q.record.rawId}><td className="mono small">{q.record.rawId}</td><td className="small">{q.record.source}</td><td className="small">{q.failures.map((f) => <div key={f.ruleId}><span className="mono">{f.ruleId}</span>: {f.message}</div>)}</td></tr>)}</tbody>
                    </table>
                  </div>
                </>
              )}
              {stage === 'Deduplicate' && (
                <>
                  <h3 style={{ margin: 0 }}>Deduplicate</h3>
                  <p className="small"><strong>D1 exact duplicates</strong> — identical payload delivered twice (file re-sent): keep the first, record the dropped raw ID in lineage.</p>
                  <table className="data compact"><thead><tr><th>Dropped</th><th>Kept</th></tr></thead><tbody>{run.dedup.exactDuplicates.map((d) => <tr key={d.dropped}><td className="mono small">{d.dropped}</td><td className="mono small">{d.keptRawId}</td></tr>)}</tbody></table>
                  <p className="small"><strong>D2 natural-key duplicates</strong> — same document number with a changed amount (a corrected re-issue): keep the latest delivery.</p>
                  <table className="data compact"><thead><tr><th>Natural key</th><th>Dropped (older)</th><th>Kept (latest)</th></tr></thead><tbody>{run.dedup.keyDuplicates.map((d) => <tr key={d.dropped}><td className="mono small">{d.naturalKey}</td><td className="mono small">{d.dropped}</td><td className="mono small">{d.keptRawId}</td></tr>)}</tbody></table>
                  <p className="small muted" style={{ margin: 0 }}>Trade-off: “latest wins” is right for corrected re-issues but wrong if two genuinely different payments share a number. A production pipeline would quarantine D2 conflicts above a materiality threshold for review.</p>
                </>
              )}
              {stage === 'Model' && (
                <>
                  <h3 style={{ margin: 0 }}>Model — star schema</h3>
                  <Diagram label="Star schema: fact_payment joined to dim_customer, dim_date and dim_channel" width={560} height={250}
                    nodes={[
                      { id: 'f', x: 190, y: 90, w: 180, h: 70, title: 'fact_payment', sub: `${run.facts.length} rows · amount_cad, lineage`, tone: 'accent' },
                      { id: 'c', x: 10, y: 10, w: 150, title: 'dim_customer', sub: 'segment, region' },
                      { id: 'd', x: 400, y: 10, w: 150, title: 'dim_date', sub: 'day, month' },
                      { id: 'ch', x: 10, y: 180, w: 150, title: 'dim_channel', sub: 'Card / EFT / AR' },
                      { id: 'fx', x: 400, y: 180, w: 150, title: 'ref_fx_rate', sub: 'currency × month' },
                    ]}
                    edges={[{ from: 'c', to: 'f', fromSide: 'r', toSide: 'l' }, { from: 'd', to: 'f', fromSide: 'l', toSide: 'r' }, { from: 'ch', to: 'f', fromSide: 'r', toSide: 'l' }, { from: 'fx', to: 'f', fromSide: 'l', toSide: 'r' }]} />
                  <div className="table-wrap" style={{ maxHeight: 240 }}>
                    <table className="data compact">
                      <thead><tr><th>payment_key</th><th>date</th><th>channel</th><th>segment</th><th className="num">orig.</th><th>ccy</th><th className="num">CAD</th></tr></thead>
                      <tbody>{run.facts.slice(0, 12).map((f) => <tr key={f.paymentKey}><td className="mono small">{f.paymentKey}</td><td className="mono small">{f.dateKey}</td><td className="small">{f.channel}</td><td className="small">{f.segment}</td><td className="num small">{f.amountOriginal.toFixed(2)}</td><td className="small">{f.currency}</td><td className="num small">{f.amountCad === null ? 'NULL' : f.amountCad.toFixed(2)}</td></tr>)}</tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card">
            <h3>Dashboard (computed from fact_payment)</h3>
            <div className="grid cols-2">
              <div>
                <div className="small" style={{ fontWeight: 600 }}>Monthly volume by channel (CAD)</div>
                <ColumnChart label="Monthly CAD volume by channel" categories={months} series={channels.map((ch) => ({ name: ch, values: months.map((m) => run.metrics.monthlyByChannel.find((x) => x.month === m && x.channel === ch)?.amountCad ?? 0) }))} />
              </div>
              <div className="stack">
                <div>
                  <div className="small" style={{ fontWeight: 600 }}>Data-quality dimensions</div>
                  <HBarChart label="Data quality" format={(v) => pct(v)} data={[
                    { label: 'Completeness', value: run.metrics.dq.completeness }, { label: 'Validity', value: run.metrics.dq.validity },
                    { label: 'Uniqueness', value: run.metrics.dq.uniqueness }, { label: 'Integrity', value: run.metrics.dq.integrity },
                  ]} />
                </div>
                <div>
                  <div className="small" style={{ fontWeight: 600 }}>Quarantine by rule (enabled rules)</div>
                  <HBarChart label="Rejections by rule" color="var(--amber)" data={VALIDATION_RULES.map((v) => ({ label: v.id, value: enabled.has(v.id) ? run.metrics.rejectionsByRule[v.id] : 0 }))} />
                </div>
              </div>
            </div>
            <p className="small muted" style={{ marginTop: 8, marginBottom: 0 }}>Quality dimensions are measured over all {run.staged.length} staged rows with every rule, so switching rules off changes what flows through — not the measured quality of the data.</p>
          </div>

          <div className="card">
            <h3>Reconciliation controls: is every raw row accounted for?</h3>
            <p className="small muted">Each delivery must end in exactly one place: quarantine, removed as a duplicate, or a fact row.</p>
            <div className="table-wrap">
              <table className="data compact">
                <thead><tr><th>Source</th><th className="num">Raw</th><th className="num">Quarantined</th><th className="num">Duplicates</th><th className="num">Facts</th><th className="num">Fact total (CAD)</th><th>Control</th></tr></thead>
                <tbody>{controls.map((c) => (
                  <tr key={c.source}><td className="mono small">{c.source}</td><td className="num">{c.raw}</td><td className="num">{c.quarantined}</td><td className="num">{c.duplicatesRemoved}</td><td className="num">{c.facts}</td><td className="num">{money(c.factAmountCad)}</td>
                    <td><Badge tone={c.balanced ? 'green' : 'red'}>{c.balanced ? 'Balanced' : 'Out of balance'}</Badge></td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3>Lineage tracer</h3>
            <div className="row" style={{ alignItems: 'end' }}>
              <div className="field" style={{ maxWidth: 360 }}>
                <label htmlFor="tk">Fact row</label>
                <select id="tk" value={traceKey} onChange={(e) => setTraceKey(e.target.value)}>
                  <optgroup label="Built from more than one delivery">{mergedFacts.map((f) => <option key={f.paymentKey} value={f.paymentKey}>{f.paymentKey} · {f.naturalKey}</option>)}</optgroup>
                  <optgroup label="All facts (first 40)">{run.facts.slice(0, 40).map((f) => <option key={f.paymentKey} value={f.paymentKey}>{f.paymentKey} · {f.naturalKey}</option>)}</optgroup>
                </select>
              </div>
            </div>
            {trace ? (
              <div className="stack" style={{ marginTop: 12 }}>
                <div className="trace">
                  {trace.raw.map((r) => <span key={r.rawId} className="node">{r.rawId} · {r.source} · {r.ingestedAt.slice(11, 19)}</span>)}
                  <span className="arrow">→</span><span className="node">standardize</span><span className="arrow">→</span><span className="node">validate ✓</span>
                  <span className="arrow">→</span><span className="node">dedup{trace.raw.length > 1 ? ` (${trace.raw.length}→1)` : ''}</span><span className="arrow">→</span>
                  <span className="node">{trace.fact.paymentKey} · {trace.fact.amountCad === null ? 'no CAD' : money(trace.fact.amountCad)}</span>
                </div>
                <div className="grid cols-2" style={{ gap: 10 }}>
                  {trace.raw.map((r) => <CodeBlock key={r.rawId} lang="json" title={`${r.rawId} (raw)`} code={JSON.stringify(r.payload, null, 2)} />)}
                  <CodeBlock lang="json" title={`${trace.fact.paymentKey} (fact)`} code={JSON.stringify(trace.fact, null, 2)} />
                </div>
              </div>
            ) : <div className="empty">Select a fact row.</div>}
          </div>

          <details className="disclosure">
            <summary>Code: standardize, validate and deduplicate (src/engine/pipeline/pipeline.ts)</summary>
            <div className="body stack">
              <CodeBlock title="standardize()" code={extractBlock(pipelineSrc, 'standardize')} maxHeight={360} />
              <CodeBlock title="VALIDATION_RULES" code={extractBlock(pipelineSrc, 'VALIDATION_RULES')} />
              <CodeBlock title="deduplicate()" code={extractBlock(pipelineSrc, 'deduplicate')} />
            </div>
          </details>
          <SqlPanel file="pipeline_model.sql" intro="Analytical SQL over the modelled star schema. The monthly query is checked against the TypeScript metrics by scripts/check_sql.py." />
          <p className="small muted">Badges: <Badge tone="green">tested</Badge> stage counts, quarantine assignments, dedup decisions, FX conversion, metric totals and lineage are covered by <span className="mono">tests/pipeline.test.ts</span>.</p>
        </div>
      </section>
    </>
  );
}

function SourcePicker({ value, onChange }: { value: SourceName; onChange: (s: SourceName) => void }) {
  return (
    <div className="row" role="group" aria-label="Source">
      {SOURCES.map((s) => <button key={s.id} className={`btn btn-sm ${value === s.id ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={value === s.id} onClick={() => onChange(s.id)}>{s.label}</button>)}
    </div>
  );
}

function RawTable({ rows }: { rows: ReturnType<typeof pipeline>['raw'] }) {
  const cols = Object.keys(rows[0]?.payload ?? {});
  const { seededIssues } = pipeline();
  return (
    <div className="table-wrap">
      <table className="data compact">
        <thead><tr><th>rawId</th>{cols.map((c) => <th key={c}>{c}</th>)}<th>Seeded issue</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.rawId}><td className="mono small">{r.rawId}</td>{cols.map((c) => <td key={c} className="mono small">{r.payload[c] === '' ? <span className="muted">∅</span> : r.payload[c]}</td>)}<td className="small">{seededIssues[r.rawId] ? <Badge tone="amber">{seededIssues[r.rawId].replace('_', ' ')}</Badge> : '—'}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
