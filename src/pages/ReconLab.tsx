import { useEffect, useMemo, useState } from 'react';
import { Link, useRoute } from '../router';
import { LabBrief } from '../components/LabBrief';
import { HBarChart } from '../components/charts';
import { aml, recon } from '../data/instances';
import { EXTRACT_FILE, GL_NAMES, RECON_SEED, type TargetEntry } from '../data/recon/generate';
import { MATCHING_RULES, STATUS_INFO, reconcile, type ReconResult, type ReconStatus } from '../engine/recon/match';
import { applyAll, applyCorrection, type CorrectionJournalEntry } from '../engine/recon/corrections';
import { Badge, CodeBlock, Kpi, SimBanner, extractBlock } from '../components/ui';
import { SqlPanel } from '../components/SqlPanel';
import { money, pct } from '../lib/format';
import matchSrc from '../engine/recon/match.ts?raw';

const toneClass: Record<string, string> = { ok: 'green', warn: 'amber', bad: 'red', info: 'blue' };
const AML_LINKED: Record<string, string> = { 'RCPT-55821': 'CUS-1031', 'RCPT-48807': 'CUS-1024', 'RCPT-48812': 'CUS-1024', 'RCPT-48830': 'CUS-1024' };

export function ReconLab() {
  const ds = recon();
  const [target, setTarget] = useState<TargetEntry[]>(ds.target);
  const [journal, setJournal] = useState<CorrectionJournalEntry[]>([]);
  const [run, setRun] = useState<ReturnType<typeof reconcile> | null>(null);
  const [runCount, setRunCount] = useState(0);
  const [stale, setStale] = useState(false);
  const [filter, setFilter] = useState<ReconStatus | 'EXCEPTIONS' | 'ALL'>('EXCEPTIONS');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [appliedInRun, setAppliedInRun] = useState<Set<string>>(new Set());
  const route = useRoute();
  const refParam = route.query.get('ref');

  const doRun = (t = target) => {
    const r = reconcile(ds.source, t, ds.staging);
    setRun(r); setStale(false); setRunCount((n) => n + 1); setAppliedInRun(new Set());
    setMessage(`Reconciliation run ${runCount + 1} complete: ${r.summary.byStatus.MATCHED} matched, ${r.summary.total - r.summary.byStatus.MATCHED} exception(s).`);
    if (selected && !r.results.some((x) => x.resultId === selected)) setSelected(null);
  };
  // Deep link from the AML lab: ?ref=RCPT-55821 runs the reconciliation and opens that reference.
  useEffect(() => {
    if (!refParam) return;
    const r = reconcile(ds.source, target, ds.staging);
    setRun(r); setRunCount((n) => n || 1); setFilter('ALL'); setQ(refParam);
    const hit = r.results.find((x) => x.status !== 'MATCHED' && [x.sourceId, ...x.targetIds].some((id) => {
      const src = ds.source.find((s) => s.srcId === id);
      const tgt = ds.target.find((t) => t.jeId === id);
      return src?.reference === refParam || tgt?.reference === refParam;
    }));
    if (hit) setSelected(hit.resultId);
    setMessage(`Opened from the AML lab: reconciliation run for ${refParam}.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refParam]);

  const apply = (res: ReconResult) => {
    const next = applyCorrection(res, ds.source, target, journal);
    setTarget(next.target); setJournal(next.journal); setStale(true);
    setAppliedInRun((s) => new Set([...s, res.resultId]));
    setMessage(`Applied ${next.journal.at(-1)!.correctionId} (${res.correction!.action}). Results are stale — re-run validation.`);
  };
  const applyAllNow = () => {
    if (!run) return;
    const pending = run.results.filter((r) => r.correction && !appliedInRun.has(r.resultId));
    const next = applyAll(pending, ds.source, target, journal);
    setTarget(next.target); setJournal(next.journal); setStale(true);
    setAppliedInRun((s) => new Set([...s, ...pending.map((p) => p.resultId)]));
    setMessage(`Applied ${next.journal.length - journal.length} correction(s). Results are stale — re-run validation.`);
  };
  const reset = () => { setTarget(ds.target); setJournal([]); setRun(null); setStale(false); setSelected(null); setRunCount(0); setAppliedInRun(new Set()); setMessage('Ledger reset to the migrated state. Run reconciliation to start again.'); };

  const appliedIds = appliedInRun;
  const rows = useMemo(() => (run?.results ?? []).filter((r) => {
    if (filter === 'EXCEPTIONS' && r.status === 'MATCHED') return false;
    if (filter !== 'ALL' && filter !== 'EXCEPTIONS' && r.status !== filter) return false;
    if (q) {
      const s = ds.source.find((x) => x.srcId === r.sourceId);
      const hay = `${r.resultId} ${r.sourceId ?? ''} ${r.targetIds.join(' ')} ${s?.reference ?? ''} ${s?.customerId ?? ''}`.toLowerCase();
      if (!hay.includes(q.toLowerCase().trim())) return false;
    }
    return true;
  }), [run, filter, q, ds.source]);
  const sel = run?.results.find((r) => r.resultId === selected) ?? null;

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">Lab 2</div>
          <h1>ERP financial reconciliation & migration integrity lab</h1>
          <p className="lead">Harbourline Community Finance migrated May 2026 postings from its legacy core into a new ERP ledger (batch MIG-0612). Reconcile the legacy extract against the ERP, find out <em>why</em> each exception happened, correct it, and validate again.</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container stack">
          <SimBanner>Fictional ledger data generated from seed {RECON_SEED}: {ds.source.length} legacy rows ({EXTRACT_FILE}) and {ds.target.length} ERP entries with seeded defects.</SimBanner>
          <ReconBrief />

          <div className="card">
            <div className="row between">
              <div>
                <h3 style={{ margin: 0 }}>Reconciliation controls</h3>
                <p className="small muted" style={{ margin: '4px 0 0' }}>Source of truth: legacy extract. Corrections create a new ledger version plus an audit journal; the source is never edited.</p>
              </div>
              <div className="row">
                <button className="btn btn-primary" onClick={() => doRun()}>{run ? 'Re-run validation' : 'Run reconciliation'}</button>
                <button className="btn btn-secondary" disabled={!run || !run.results.some((r) => r.correction && !appliedIds.has(r.resultId))} onClick={applyAllNow}>Apply all proposed corrections</button>
                <button className="btn btn-danger" disabled={!run && !journal.length} onClick={reset}>Reset ledger</button>
              </div>
            </div>
            <p className="small" aria-live="polite" style={{ margin: message ? '10px 0 0' : 0 }}>{message}</p>
            {stale && <div className="callout warn" style={{ marginTop: 10 }}><p className="small"><strong>Results are stale.</strong> {journal.length} correction(s) applied since the last run. Re-run validation to see the effect.</p></div>}
          </div>

          {!run ? (
            <div className="empty">
              <p><strong>No reconciliation has been run yet.</strong></p>
              <p className="small">Press “Run reconciliation” to compare {ds.source.length} legacy rows with {ds.target.length} ERP entries using rules M0–M5 below.</p>
            </div>
          ) : (
            <>
              <div className="kpis">
                <Kpi label="Run" value={`#${runCount}`} sub={journal.length ? `${journal.length} corrections in ledger` : 'Original migrated ledger'} />
                <Kpi label="Source rows" value={run.summary.sourceRows} sub="legacy extract" />
                <Kpi label="ERP entries (posted)" value={run.summary.targetRows} sub="reversed entries excluded" />
                <Kpi label="Matched" value={run.summary.byStatus.MATCHED} sub={`${pct(run.summary.matchRate)} of source rows`} />
                <Kpi label="Exceptions" value={run.summary.total - run.summary.byStatus.MATCHED} sub="need action or review" />
                <Kpi label="Net difference" value={money(run.summary.netDifference)} sub={`ERP ${money(run.summary.targetTotal)} vs source ${money(run.summary.sourceTotal)}`} />
              </div>

              <div className="card">
                <h3>Results by status</h3>
                <div className="row" style={{ gap: 8 }}>
                  {(['EXCEPTIONS', 'ALL'] as const).map((f) => <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === 'ALL' ? `All (${run.summary.total})` : `Exceptions (${run.summary.total - run.summary.byStatus.MATCHED})`}</button>)}
                  {(Object.keys(STATUS_INFO) as ReconStatus[]).map((s) => (
                    <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={filter === s} onClick={() => setFilter(s)} disabled={!run.summary.byStatus[s]}>
                      {STATUS_INFO[s].label} ({run.summary.byStatus[s]})
                    </button>
                  ))}
                </div>
              </div>

              <div className="split">
                <div className="stack">
                  <div className="field"><label htmlFor="rq">Search reference, customer, source or JE ID</label><input id="rq" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. RCPT-55821" /></div>
                  {rows.length === 0 ? <div className="empty">{filter === 'EXCEPTIONS' ? 'No exceptions — every source row is matched.' : 'No results match.'}</div> : (
                    <div className="table-wrap" style={{ maxHeight: 560 }}>
                      <table className="data compact">
                        <thead><tr><th>Result</th><th>Status</th><th>Reference</th><th className="num">Source</th><th className="num">ERP</th><th>Root cause</th></tr></thead>
                        <tbody>
                          {rows.map((r) => {
                            const s = ds.source.find((x) => x.srcId === r.sourceId);
                            const t = target.find((x) => x.jeId === r.targetIds[0]);
                            return (
                              <tr key={r.resultId} className={`clickable ${selected === r.resultId ? 'selected' : ''}`} onClick={() => setSelected(r.resultId)}>
                                <td><button className="btn btn-ghost btn-sm mono" style={{ padding: 0 }} onClick={() => setSelected(r.resultId)}>{r.resultId}</button>{appliedIds.has(r.resultId) && <div><Badge tone="green">correction applied</Badge></div>}</td>
                                <td><Badge tone={toneClass[STATUS_INFO[r.status].tone]}>{STATUS_INFO[r.status].label}</Badge></td>
                                <td className="mono small">{s?.reference ?? t?.reference}</td>
                                <td className="num small">{s ? money(s.amount) : '—'}</td>
                                <td className="num small">{t ? money(t.amount) : '—'}</td>
                                <td className="small">{r.rootCause.label}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div>
                  {sel ? <ResultDetail r={sel} target={target} applied={appliedIds.has(sel.resultId)} onApply={() => apply(sel)} /> : (
                    <div className="empty">Select a result to see the source/ERP comparison, lineage, root cause and proposed correction.</div>
                  )}
                </div>
              </div>
            </>
          )}

          {journal.length > 0 && (
            <div className="card">
              <h3>Correction journal (audit trail)</h3>
              <div className="table-wrap">
                <table className="data compact">
                  <thead><tr><th>ID</th><th>Result</th><th>Action</th><th>Entry</th><th>Before</th><th>After</th></tr></thead>
                  <tbody>{journal.map((j) => <tr key={j.correctionId + j.jeId}><td className="mono">{j.correctionId}</td><td className="mono">{j.resultId}</td><td className="small">{j.action}</td><td className="mono small">{j.jeId}</td><td className="mono small">{j.before}</td><td className="mono small">{j.after}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}

          <div className="callout">
            <h4>Why this matters for AML monitoring</h4>
            <p className="small">The same references appear in the AML lab. The decimal shift on <span className="mono">RCPT-55821</span> turns a {money(12450)} receipt into {money(1245000)} and triggers two monitoring rules; the duplicate load of <span className="mono">RCPT-48807/48812/48830</span> triggers the duplicate-posting rule. Reconciliation evidence lets an investigator close those alerts as explained data exceptions — while the two manual journals with no source remain open for finance review, because a clean explanation for some anomalies is not an explanation for all of them.</p>
            <div className="row">
              <Link className="btn btn-secondary btn-sm" to="/labs/aml" query={{ tab: 'case', case: aml().alerts.find((a) => a.customerId === AML_LINKED['RCPT-55821'])!.caseId }}>Open the decimal-shift AML case</Link>
              <Link className="btn btn-secondary btn-sm" to="/labs/aml" query={{ tab: 'case', case: aml().alerts.find((a) => a.customerId === 'CUS-1024')!.caseId }}>Open the duplicate-load AML case</Link>
            </div>
          </div>

          <div className="card">
            <h3>Matching rules (transparent, applied in order)</h3>
            <table className="data compact"><tbody>{MATCHING_RULES.map((m) => <tr key={m.id}><td className="mono">{m.id}</td><td className="small">{m.text}</td></tr>)}</tbody></table>
            <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>The matcher pairs on business keys only — lineage keys are used afterwards to explain root causes, because in real migrations they often don’t survive. A test proves results are identical with lineage keys removed.</p>
          </div>

          <details className="disclosure">
            <summary>Root-cause classification code (src/engine/recon/match.ts)</summary>
            <div className="body stack">
              <CodeBlock title="normalizeRef()" code={extractBlock(matchSrc, 'normalizeRef')} />
              <CodeBlock title="amountCause() — decimal shift, transposition, rounding" code={extractBlock(matchSrc, 'amountCause')} />
              <CodeBlock title="refCause() — encoding, formatting, truncation, transposition" code={extractBlock(matchSrc, 'refCause')} />
            </div>
          </details>

          <SqlPanel file="reconciliation.sql" intro="The full reconciliation implemented in SQL. scripts/check_sql.py asserts it returns exactly the same (source, ERP entry, status) rows as the TypeScript matcher on the seeded data." />
        </div>
      </section>
    </>
  );
}

function ResultDetail({ r, target, applied, onApply }: { r: ReconResult; target: TargetEntry[]; applied: boolean; onApply: () => void }) {
  const ds = recon();
  const s = ds.source.find((x) => x.srcId === r.sourceId);
  const ts = r.targetIds.map((id) => target.find((x) => x.jeId === id) ?? ds.target.find((x) => x.jeId === id)!).filter(Boolean);
  const t = ts[0];
  const stg = s ? ds.staging.find((x) => x.srcId === s.srcId) : null;
  const fields: { label: string; src: string; tgt: string }[] = [
    { label: 'Posting date', src: s?.postingDate ?? '—', tgt: t?.postingDate ?? '—' },
    { label: 'Reference', src: s ? JSON.stringify(s.reference) : '—', tgt: t ? JSON.stringify(t.reference) : '—' },
    { label: 'Amount', src: s ? s.amount.toFixed(2) : '—', tgt: t ? t.amount.toFixed(2) : '—' },
    { label: 'GL account', src: s ? `${s.segment} → ${({ RT: '2110', SB: '2100', CM: '2100' } as Record<string, string>)[s.segment]} (expected)` : '—', tgt: t ? `${t.glAccount} ${GL_NAMES[t.glAccount] ?? ''}` : '—' },
    { label: 'Customer', src: s?.customerId ?? '—', tgt: t?.customerId ?? '—' },
  ];
  const differs = (f: { label: string; src: string; tgt: string }) => s && t && (f.label === 'GL account' ? !f.src.includes(`→ ${t.glAccount}`) : f.src !== f.tgt);
  return (
    <div className="card stack">
      <div className="row between">
        <h3 style={{ margin: 0 }} className="mono">{r.resultId}</h3>
        <Badge tone={toneClass[STATUS_INFO[r.status].tone]}>{STATUS_INFO[r.status].label}</Badge>
      </div>
      <div className="table-wrap">
        <table className="data compact">
          <thead><tr><th>Field</th><th>Legacy source {s && <span className="mono muted">{s.srcId}</span>}</th><th>ERP {t && <span className="mono muted">{t.jeId}</span>}</th></tr></thead>
          <tbody>{fields.map((f) => <tr key={f.label} className={differs(f) ? 'highlight' : undefined}><td>{f.label}</td><td className="mono small">{f.src}</td><td className="mono small">{f.tgt}</td></tr>)}</tbody>
        </table>
      </div>
      <div>
        <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>Source-to-target lineage</div>
        <div className="trace">
          {s ? <span className="node">{EXTRACT_FILE} · row {s.extractRow}</span> : <span className="node">no source row</span>}
          <span className="arrow">→</span>
          {stg ? <span className="node">{stg.stagingRowId} · map {stg.mappingVersion} · {stg.loadStatus}{stg.loadRuns.length ? ` · runs [${stg.loadRuns.join(',')}]` : ''}</span> : <span className="node">not staged</span>}
          <span className="arrow">→</span>
          {ts.length ? ts.map((x) => <span key={x.jeId} className="node">{x.jeId}{x.migrationBatch ? ` · ${x.migrationBatch} run ${x.loadRun}` : ` · ${x.entryType}`}{x.status === 'REVERSED' ? ' · REVERSED' : ''}</span>) : <span className="node">no ERP entry</span>}
        </div>
      </div>
      <div className={`callout ${r.status === 'MATCHED' ? '' : r.status === 'UNMATCHED_IN_TARGET' ? 'info' : 'warn'}`}>
        <h4>Likely root cause: {r.rootCause.label}</h4>
        {r.rootCause.evidence.length ? <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{r.rootCause.evidence.map((e) => <li key={e}>{e}</li>)}</ul> : <p className="small">No exception.</p>}
        {r.notes.length > 0 && <p className="small muted" style={{ marginTop: 6 }}>{r.notes.join(' ')}</p>}
        {s && AML_LINKED[s.reference] && <p className="small" style={{ marginTop: 6 }}>This reference also appears in an <Link to="/labs/aml" query={{ tab: 'case', case: aml().alerts.find((a) => a.customerId === AML_LINKED[s.reference])!.caseId }}>AML alert</Link>.</p>}
      </div>
      {r.correction ? (
        <div>
          <div className="small" style={{ fontWeight: 600 }}>Proposed correction · {r.correction.action}</div>
          <p className="small">{r.correction.description}</p>
          <button className="btn btn-primary btn-sm" disabled={applied} onClick={onApply}>{applied ? 'Applied — re-run to validate' : 'Apply this correction'}</button>
        </div>
      ) : r.status !== 'MATCHED' ? (
        <p className="small"><strong>No automatic correction.</strong> Route to finance for review: confirm supporting documentation or reverse the entry.</p>
      ) : null}
    </div>
  );
}

function ReconBrief() {
  const ds = recon();
  const sim = useMemo(() => {
    const base = reconcile(ds.source, ds.target, ds.staging);
    const fixed = applyAll(base.results, ds.source, ds.target);
    const after = reconcile(ds.source, fixed.target, ds.staging);
    return { base, fixed, after };
  }, [ds]);
  const exceptions = sim.base.summary.total - sim.base.summary.byStatus.MATCHED;
  const remaining = sim.after.summary.total - sim.after.summary.byStatus.MATCHED;
  const cats = (Object.keys(STATUS_INFO) as ReconStatus[]).filter((k) => k !== 'MATCHED' && sim.base.summary.byStatus[k] > 0);
  return (
    <>
      <LabBrief
        problem="After a migration, the new ERP ledger must contain exactly what the legacy system held. Rows go missing, get loaded twice, lose characters, land in the wrong GL account or change amount and date."
        why="Finance cannot sign off a ledger that doesn’t tie out. The same defects flow into reporting and monitoring, where a decimal-scale error or a duplicated load can look exactly like suspicious activity."
        proves="Source-to-target reconciliation with transparent rules, root-cause analysis from value patterns and lineage, and controlled, auditable corrections that never touch the source."
        capabilities={['Business-key matching with normalization and fuzzy fallback', 'Root-cause classification (decimal shift, transposition, encoding, date swap, re-run)', 'Lineage: extract row → staging → load run → journal entry', 'Correction journal and re-run', 'Same logic in SQL, verified row-for-row on SQLite']}
        findings={[
          <>Initial match rate {pct(sim.base.summary.matchRate)} with {exceptions} exceptions across {cats.length} categories.</>,
          <>{sim.fixed.journal.length} proposed corrections applied; final match rate {pct(sim.after.summary.matchRate)}.</>,
          <>{remaining} items remain unresolved: manual journals with no source document, left for finance review on purpose.</>,
        ]}
        limitations={['One-to-one and duplicate matching only; no many-to-one aggregation', 'Corrections are simulated, not ERP reversing entries under approval', 'Single month, single batch, synthetic data']}
        technical={<p>The matcher (<span className="mono">src/engine/recon/match.ts</span>) ranks key-matched candidates by amount gap, date gap and load run, then classifies each pair with a first-failing-check rule. It deliberately ignores lineage keys when pairing; a test proves results are identical with them stripped. Corrections produce a new ledger version plus a journal, and <span className="mono">sql/reconciliation.sql</span> reproduces every result row in SQLite (<span className="mono">scripts/check_sql.py</span>).</p>}
      />
      <div className="card">
        <div className="row between"><h3 style={{ margin: 0 }}>Simulation results: original ledger vs. all proposed corrections</h3><span className="badge badge-sim">Simulation</span></div>
        <div className="kpis" style={{ marginTop: 12 }}>
          <Kpi label="Initial match rate" value={pct(sim.base.summary.matchRate)} sub={`${sim.base.summary.byStatus.MATCHED} of ${ds.source.length} source rows`} />
          <Kpi label="Exceptions" value={exceptions} sub={`${cats.length} categories`} />
          <Kpi label="Corrected" value={exceptions - remaining} sub={`${sim.fixed.journal.length} journal entries`} />
          <Kpi label="Remaining unresolved" value={remaining} sub="need human review" />
          <Kpi label="Final match rate" value={pct(sim.after.summary.matchRate)} sub={`net difference ${money(sim.after.summary.netDifference)}`} />
        </div>
        <div style={{ marginTop: 14 }}>
          <div className="small" style={{ fontWeight: 600 }}>Exceptions by category (original ledger)</div>
          <HBarChart label="Exceptions by category" color="var(--amber)" data={cats.map((k) => ({ label: STATUS_INFO[k].label, value: sim.base.summary.byStatus[k] }))} />
        </div>
        <p className="small muted" style={{ margin: '8px 0 0' }}>Computed in your browser from the seeded data. The interactive controls below let you reproduce these numbers step by step.</p>
      </div>
    </>
  );
}
