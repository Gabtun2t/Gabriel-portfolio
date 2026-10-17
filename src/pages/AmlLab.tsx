import { useMemo, useState } from 'react';
import { Link, navigate, useRoute } from '../router';
import { aml, scenarioFor } from '../data/instances';
import { SCENARIOS, AML_SEED } from '../data/aml/generate';
import { buildEvidence, BAND_THRESHOLDS, type Alert } from '../engine/aml/alerts';
import { RULE_CATALOG, ruleById, type RuleId } from '../engine/aml/rules';
import { DISPOSITIONS, MIN_RATIONALE_CHARS, buildNarrative, closeEligibility, validateDisposition, type DispositionCode, type DispositionRecord } from '../engine/aml/disposition';
import { Badge, CodeBlock, Kpi, Modal, SimBanner, Tabs, downloadText, extractBlock, store, useSort } from '../components/ui';
import { DailyChart, HBarChart } from '../components/charts';
import { SqlPanel } from '../components/SqlPanel';
import { count, money, money0, pct } from '../lib/format';
import { dateRange } from '../lib/dates';
import rulesSrc from '../engine/aml/rules.ts?raw';
import alertsSrc from '../engine/aml/alerts.ts?raw';
import dispositionSrc from '../engine/aml/disposition.ts?raw';
import amlTestsSrc from '../../tests/aml.test.ts?raw';

type Tab = 'overview' | 'queue' | 'case' | 'rules' | 'data';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'queue', label: 'Alert queue' },
  { id: 'case', label: 'Case investigation' },
  { id: 'rules', label: 'Rules, code & tests' },
  { id: 'data', label: 'Data & scenarios' },
];

const DECISIONS_KEY = 'aml-lab-decisions-v1';
const NOTES_KEY = 'aml-lab-notes-v1';
type Notes = Record<string, { at: string; text: string }[]>;

const fmtMeasure = (v: number) => (v > 0 && v < 1 ? pct(v) : v.toLocaleString('en-CA', { maximumFractionDigits: 2 }));

export const bandTone = (b: string) => (b === 'High' ? 'red' : b === 'Medium' ? 'amber' : 'neutral');
const statusLabel = (d?: DispositionRecord) => (d ? DISPOSITIONS.find((x) => x.code === d.code)!.label : 'Open');
const statusTone = (d?: DispositionRecord) => (!d ? 'blue' : d.code === 'ESCALATE_TO_COMPLIANCE' ? 'red' : d.code === 'CLOSE_EXPLAINED_EXCEPTION' ? 'green' : 'amber');

const FN_FOR_RULE: Record<RuleId, string> = {
  R1_HIGH_VELOCITY: 'r1HighVelocity', R2_LARGE_VS_PROFILE: 'r2LargeVsProfile', R3_CASH_JUST_BELOW_THRESHOLD: 'r3CashJustBelowThreshold',
  R4_INFLOW_EXCEEDS_PROFILE: 'r4InflowExceedsProfile', R5_DUPLICATE_POSTING: 'r5DuplicatePosting', R6_RAPID_PASS_THROUGH: 'r6RapidPassThrough', R7_PROFILE_INCONSISTENCY: 'r7ProfileInconsistency',
};

export function AmlLab() {
  const route = useRoute();
  const tab = (TABS.some((t) => t.id === route.query.get('tab')) ? route.query.get('tab') : 'overview') as Tab;
  const caseId = route.query.get('case');
  const [decisions, setDecisions] = useState<Record<string, DispositionRecord>>(() => store.get(DECISIONS_KEY, {}));
  const [notes, setNotes] = useState<Notes>(() => store.get(NOTES_KEY, {}));
  const saveDecision = (caseId: string, rec: DispositionRecord | null) => {
    setDecisions((prev) => {
      const next = { ...prev };
      if (rec) next[caseId] = rec; else delete next[caseId];
      store.set(DECISIONS_KEY, next);
      return next;
    });
  };
  const addNote = (caseId: string, text: string) => {
    setNotes((prev) => {
      const next = { ...prev, [caseId]: [...(prev[caseId] ?? []), { at: new Date().toISOString().slice(0, 16).replace('T', ' '), text }] };
      store.set(NOTES_KEY, next);
      return next;
    });
  };
  const resetAll = () => { store.remove(DECISIONS_KEY); store.remove(NOTES_KEY); setDecisions({}); setNotes({}); };
  const go = (t: Tab, c?: string | null) => navigate('/labs/aml', { tab: t, case: c ?? (t === 'case' ? caseId : null) }, { replace: true });

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">Lab 1 · Flagship</div>
          <h1>AML transaction monitoring & investigation lab</h1>
          <p className="lead">A rule-based monitoring and case-investigation environment for a fictional lender, <em>Harbourline Community Finance</em>. Detection, scoring, evidence checks and narrative generation run in your browser from a fixed seed.</p>
          <div className="row">
            <button className="btn btn-primary" onClick={() => go('queue')}>Go to the alert queue</button>
            <Link to="/case-studies" className="btn btn-secondary">Methodology & case study</Link>
          </div>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container stack">
          <SimBanner>Fictional customers, accounts and transactions (seed {AML_SEED}). Alerts and risk indicators require professional review; they do not establish fraud, money laundering or any regulatory conclusion, and this tool makes no reporting decisions.</SimBanner>
          <Tabs tabs={TABS} value={tab} onChange={(t) => go(t)} label="AML lab sections" />
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === 'overview' && <Overview decisions={decisions} onOpen={(c) => go('case', c)} onReset={resetAll} />}
            {tab === 'queue' && <Queue decisions={decisions} onOpen={(c) => go('case', c)} />}
            {tab === 'case' && <CaseView caseId={caseId} decisions={decisions} notes={notes} onSave={saveDecision} onNote={addNote} onOpen={(c) => go('case', c)} />}
            {tab === 'rules' && <RulesView />}
            {tab === 'data' && <DataView />}
          </div>
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
function Overview({ decisions, onOpen, onReset }: { decisions: Record<string, DispositionRecord>; onOpen: (c: string) => void; onReset: () => void }) {
  const { ds, alerts } = aml();
  const stats = useMemo(() => {
    const total = ds.transactions.reduce((s, t) => s + t.amount, 0);
    const migrated = ds.transactions.filter((t) => t.sourceSystem === 'MIGRATED_LEDGER').length;
    const byCat = new Map<string, number>();
    alerts.forEach((a) => byCat.set(a.primaryCategory, (byCat.get(a.primaryCategory) ?? 0) + 1));
    const byRule = RULE_CATALOG.map((r) => ({ label: r.name, value: alerts.filter((a) => a.hits.some((h) => h.ruleId === r.id)).length }));
    const days = dateRange(ds.periodStart, ds.periodEnd);
    const volume = days.map((d) => ds.transactions.filter((t) => t.date === d && t.direction === 'credit').reduce((s, t) => s + t.amount, 0));
    // R4 references every credit in the month, so it is excluded here to keep the markers meaningful.
    const alerted = new Set(alerts.flatMap((a) => a.hits.filter((h) => h.ruleId !== 'R4_INFLOW_EXCEEDS_PROFILE').flatMap((h) => h.txIds)));
    const markers = new Set(ds.transactions.filter((t) => alerted.has(t.txId)).map((t) => t.date));
    return { total, migrated, byCat, byRule, days, volume, markers };
  }, [ds, alerts]);
  const decided = alerts.filter((a) => decisions[a.caseId]).length;
  const bands = (b: string) => alerts.filter((a) => a.band === b).length;

  return (
    <div className="stack">
      <div className="kpis">
        <Kpi label="Transactions screened" value={count(ds.transactions.length)} sub={`${ds.periodStart} → ${ds.periodEnd}`} />
        <Kpi label="Value screened" value={money0(stats.total)} sub={`${count(ds.customers.length)} customers`} />
        <Kpi label="Alerts generated" value={alerts.length} sub={`${pct(alerts.length / ds.customers.length, 0)} of customers`} />
        <Kpi label="High / Medium / Low" value={`${bands('High')} / ${bands('Medium')} / ${bands('Low')}`} sub={`High ≥ ${BAND_THRESHOLDS.high}, Medium ≥ ${BAND_THRESHOLDS.medium}`} />
        <Kpi label="From migrated ledger" value={pct(stats.migrated / ds.transactions.length, 0)} sub="Apr–May rows loaded by MIG-0611/0612" />
        <Kpi label="Your decisions" value={`${decided} / ${alerts.length}`} sub={decided ? <button className="btn btn-ghost btn-sm" style={{ padding: 0 }} onClick={onReset}>Reset my decisions</button> : 'Saved in this browser only'} />
      </div>
      <div className="card">
        <div className="row between"><h3>Daily credit volume</h3><span className="legend" style={{ marginTop: 0 }}><span><i style={{ background: 'var(--blue)', opacity: 0.55 }} />All credits</span><span><i style={{ background: 'var(--amber)' }} />Day has a rule-flagged transaction (excl. R4)</span></span></div>
        <DailyChart days={stats.days} values={stats.volume} markers={stats.markers} label="Daily credit volume, April to June 2026, with days containing rule-flagged transactions highlighted" />
        <p className="small muted" style={{ margin: '6px 0 0' }}>The tallest spike (late May) is a single $1.245M receipt — the migration defect in scenario S5. Volume alone does not tell you whether it is real.</p>
      </div>
      <div className="grid cols-2">
        <div className="card">
          <h3>Alerts by primary category</h3>
          <HBarChart label="Alerts by category" data={[...stats.byCat.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)} />
        </div>
        <div className="card">
          <h3>Rule hits across alerts</h3>
          <HBarChart label="Alerts per rule" color="var(--blue)" data={stats.byRule} />
        </div>
      </div>
      <div className="card">
        <h3>How to use this lab</h3>
        <ol className="steps">
          <li>Open the <strong>alert queue</strong> and pick a case — try the highest score, then a Low one.</li>
          <li>Read <strong>why the alert fired</strong>: each rule shows the exact values and threshold.</li>
          <li>Work through the <strong>evidence panel</strong> — KYC currency, expected vs. actual activity, lineage, duplicate check, ERP cross-check, documents, and a re-evaluation on evidence-supported corrected data.</li>
          <li>Record a <strong>disposition with a rationale</strong>. “Close as explained exception” is only enabled when documents explain every triggered rule.</li>
          <li><strong>Export the case narrative</strong> (marked SIMULATION) and compare your reasoning with the teaching note.</li>
        </ol>
        <div className="row">
          {alerts.slice().sort((a, b) => b.score - a.score).slice(0, 2).map((a) => <button key={a.caseId} className="btn btn-secondary btn-sm" onClick={() => onOpen(a.caseId)}>Open {a.caseId} ({a.band})</button>)}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
interface QueueRow { caseId: string; customer: string; customerId: string; category: string; rules: number; score: number; band: string; amount: number; created: string; status: string; ruleIds: string }

function Queue({ decisions, onOpen }: { decisions: Record<string, DispositionRecord>; onOpen: (c: string) => void }) {
  const { ds, alerts } = aml();
  const [q, setQ] = useState('');
  const [band, setBand] = useState('');
  const [cat, setCat] = useState('');
  const [status, setStatus] = useState('');
  const rows: QueueRow[] = alerts.map((a) => ({
    caseId: a.caseId, customerId: a.customerId, customer: ds.customers.find((c) => c.customerId === a.customerId)!.name, category: a.primaryCategory,
    rules: a.hits.length, score: a.score, band: a.band, amount: a.involvedAmount, created: a.createdOn, status: statusLabel(decisions[a.caseId]), ruleIds: a.hits.map((h) => h.ruleId).join(' '),
  }));
  const filtered = rows.filter((r) =>
    (!q || `${r.caseId} ${r.customer} ${r.customerId}`.toLowerCase().includes(q.toLowerCase().trim())) &&
    (!band || r.band === band) && (!cat || r.category === cat) && (!status || r.status === status));
  const { sorted, header } = useSort(filtered, { key: 'score', dir: 'desc' });
  const cats = [...new Set(rows.map((r) => r.category))].sort();
  return (
    <div>
      <div className="filters" role="search">
        <div className="field"><label htmlFor="q">Search case ID or customer</label><input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. CASE-260103 or Northgate" /></div>
        <div className="field"><label htmlFor="band">Risk band</label><select id="band" value={band} onChange={(e) => setBand(e.target.value)}><option value="">All</option><option>High</option><option>Medium</option><option>Low</option></select></div>
        <div className="field"><label htmlFor="cat">Category</label><select id="cat" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All</option>{cats.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="field"><label htmlFor="st">Status</label><select id="st" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option><option>Open</option>{DISPOSITIONS.map((d) => <option key={d.code}>{d.label}</option>)}</select></div>
      </div>
      <p className="small muted" aria-live="polite">{sorted.length} of {rows.length} alerts</p>
      {sorted.length === 0 ? (
        <div className="empty">No alerts match these filters. <button className="btn btn-ghost btn-sm" onClick={() => { setQ(''); setBand(''); setCat(''); setStatus(''); }}>Clear filters</button></div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                {header('caseId', 'Case')}{header('customer', 'Customer')}{header('category', 'Category')}{header('rules', 'Rules', 'num')}
                {header('score', 'Score', 'num')}{header('amount', 'Value involved', 'num')}{header('created', 'Created')}{header('status', 'Status')}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.caseId} className="clickable" onClick={() => onOpen(r.caseId)}>
                  <td><a href={`#/labs/aml?tab=case&case=${r.caseId}`} className="mono" onClick={(e) => { e.preventDefault(); onOpen(r.caseId); }}>{r.caseId}</a></td>
                  <td>{r.customer}<div className="small muted mono">{r.customerId}</div></td>
                  <td>{r.category}<div className="small muted">{r.ruleIds.split(' ').map((id) => id.split('_')[0]).join(', ')}</div></td>
                  <td className="num">{r.rules}</td>
                  <td className="num"><Badge tone={bandTone(r.band)}>{r.band}</Badge> <span className="mono">{r.score}</span></td>
                  <td className="num">{money(r.amount)}</td>
                  <td className="mono small">{r.created}</td>
                  <td><Badge tone={statusTone(decisions[r.caseId])}>{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="small muted" style={{ marginTop: 10 }}>“Value involved” is the sum of the distinct transactions referenced by the triggered rules — it is not an amount at risk.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
function CaseView({ caseId, decisions, notes, onSave, onNote, onOpen }: {
  caseId: string | null; decisions: Record<string, DispositionRecord>; notes: Notes;
  onSave: (c: string, r: DispositionRecord | null) => void; onNote: (c: string, t: string) => void; onOpen: (c: string) => void;
}) {
  const { ds, alerts } = aml();
  const ordered = [...alerts].sort((a, b) => b.score - a.score);
  const alert = alerts.find((a) => a.caseId === caseId);
  if (!alert) {
    return (
      <div className="empty">
        <p>{caseId ? `No case with ID ${caseId}.` : 'Choose a case to investigate.'}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          {ordered.map((a) => <button key={a.caseId} className="btn btn-secondary btn-sm" onClick={() => onOpen(a.caseId)}>{a.caseId} · {a.band}</button>)}
        </div>
      </div>
    );
  }
  const idx = ordered.findIndex((a) => a.caseId === alert.caseId);
  return <CaseDetail key={alert.caseId} alert={alert} decision={decisions[alert.caseId]} notes={notes[alert.caseId] ?? []} onSave={onSave} onNote={onNote}
    prev={idx > 0 ? ordered[idx - 1].caseId : null} next={idx < ordered.length - 1 ? ordered[idx + 1].caseId : null} onOpen={onOpen} dsName={ds.customers.find((c) => c.customerId === alert.customerId)!.name} />;
}

function CaseDetail({ alert, decision, notes, onSave, onNote, prev, next, onOpen, dsName }: {
  alert: Alert; decision?: DispositionRecord; notes: { at: string; text: string }[]; onSave: (c: string, r: DispositionRecord | null) => void; onNote: (c: string, t: string) => void;
  prev: string | null; next: string | null; onOpen: (c: string) => void; dsName: string;
}) {
  const { ds } = aml();
  const c = ds.customers.find((x) => x.customerId === alert.customerId)!;
  const evidence = useMemo(() => buildEvidence(ds, alert), [ds, alert]);
  const eligibility = useMemo(() => closeEligibility(ds, alert), [ds, alert]);
  const scenario = scenarioFor(c.customerId);
  const alertedIds = useMemo(() => new Set(alert.hits.flatMap((h) => h.txIds)), [alert]);
  const txs = ds.transactions.filter((t) => t.customerId === c.customerId);
  const [onlyAlerted, setOnlyAlerted] = useState(true);
  const [reviewed, setReviewed] = useState<string[]>(decision?.reviewedEvidenceIds ?? []);
  const [code, setCode] = useState<DispositionCode | ''>(decision?.code ?? '');
  const [rationale, setRationale] = useState(decision?.rationale ?? '');
  const [analyst, setAnalyst] = useState(decision?.analyst ?? 'Portfolio visitor');
  const [errors, setErrors] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [showReport, setShowReport] = useState(false);
  const shown = onlyAlerted ? txs.filter((t) => alertedIds.has(t.txId)) : txs;

  const submit = () => {
    if (!code) { setErrors(['Choose a disposition.']); return; }
    const input = { code, rationale, reviewedEvidenceIds: reviewed, analyst: analyst.trim() || 'Portfolio visitor' };
    const errs = validateDisposition(ds, alert, input);
    setErrors(errs);
    if (!errs.length) onSave(alert.caseId, { ...input, caseId: alert.caseId, recordedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') });
  };
  const narrative = () => buildNarrative(ds, alert, evidence, decision ?? null, notes);
  const evTone = (s: string) => (s === 'ok' ? 'green' : s === 'attention' ? 'amber' : s === 'data_issue' ? 'violet' : 'neutral');
  const evLabel = (s: string) => (s === 'ok' ? 'No concern' : s === 'attention' ? 'Needs attention' : s === 'data_issue' ? 'Data issue' : 'Context');

  return (
    <div className="stack">
      <div className="card">
        <div className="row between">
          <div>
            <div className="row" style={{ gap: 8 }}>
              <h2 style={{ margin: 0 }} className="mono">{alert.caseId}</h2>
              <Badge tone={bandTone(alert.band)}>{alert.band} · {alert.score}/100</Badge>
              <Badge tone={statusTone(decision)}>{statusLabel(decision)}</Badge>
            </div>
            <p style={{ margin: '6px 0 0' }}><strong>{dsName}</strong> <span className="muted mono small">{c.customerId} · {c.accountId}</span> · alert {alert.alertId} created {alert.createdOn}</p>
          </div>
          <div className="row no-print">
            <button className="btn btn-secondary btn-sm" disabled={!prev} onClick={() => prev && onOpen(prev)}>← Previous</button>
            <button className="btn btn-secondary btn-sm" disabled={!next} onClick={() => next && onOpen(next)}>Next →</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowReport(true)}>View / export narrative</button>
          </div>
        </div>
      </div>

      <div className="split">
        <div className="stack">
          <div className="card">
            <h3>Why this alert was generated</h3>
            {alert.hits.map((h) => {
              const r = ruleById(h.ruleId);
              return (
                <div key={h.ruleId} className="evidence attention">
                  <header><h4>{r.name}</h4><span className="row" style={{ gap: 6 }}><Badge>{r.category}</Badge><Badge tone="blue">+{r.weight}</Badge></span></header>
                  <p>{h.explanation}</p>
                  <ul><li>Rule {h.ruleId}: {r.logic}</li><li>Window {h.windowStart} → {h.windowEnd} · observed {fmtMeasure(h.observed)} vs threshold {fmtMeasure(h.threshold)}</li></ul>
                </div>
              );
            })}
            <details className="disclosure" style={{ marginTop: 12 }}>
              <summary>Score breakdown ({alert.score}/100)</summary>
              <div className="body">
                <table className="data compact"><tbody>
                  {alert.scoreBreakdown.map((b) => <tr key={b.label}><td>{b.label}</td><td className="num mono">+{b.points}</td></tr>)}
                  <tr><td><strong>Total (capped at 100)</strong></td><td className="num mono"><strong>{alert.score}</strong></td></tr>
                </tbody></table>
                <p className="small muted" style={{ marginTop: 8 }}>The score orders the queue. It is not a probability of wrongdoing.</p>
              </div>
            </details>
          </div>

          <div className="card">
            <h3>Customer profile & KYC-related information</h3>
            <dl className="dl">
              <dt>Type / segment</dt><dd>{c.type} · {c.segment.replace('_', ' ')}</dd>
              <dt>Declared activity</dt><dd>{c.activity}</dd>
              <dt>Account purpose</dt><dd>{c.accountPurpose}</dd>
              <dt>Expected activity</dt><dd>{money0(c.declaredMonthlyTurnover)} credits / month · ~{c.expectedMonthlyTxCount} transactions / month · international {c.internationalExpected ? 'expected' : 'not expected'}</dd>
              <dt>Account opened</dt><dd>{c.accountOpened}</dd>
              <dt>KYC status</dt><dd><Badge tone={c.kycStatus === 'verified' ? 'green' : 'amber'}>{c.kycStatus.replace('_', ' ')}</Badge> last review {c.kycLastReview}</dd>
              <dt>Risk rating</dt><dd><Badge tone={c.riskRating === 'high' ? 'red' : c.riskRating === 'medium' ? 'amber' : 'neutral'}>{c.riskRating}</Badge> {c.riskFactors.length ? c.riskFactors.join('; ') : 'no elevating product/channel factors'}</dd>
            </dl>
            <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>Risk factors are product and channel based. Name, age, gender, nationality, ethnicity, religion and other demographic attributes are not used by any rule or score.</p>
          </div>

          <div className="card">
            <div className="row between">
              <h3 style={{ margin: 0 }}>Transaction history</h3>
              <label className="check small"><input type="checkbox" checked={onlyAlerted} onChange={(e) => setOnlyAlerted(e.target.checked)} />Only transactions referenced by the alert ({alertedIds.size})</label>
            </div>
            <div className="table-wrap" style={{ marginTop: 10, maxHeight: 420 }}>
              <table className="data compact">
                <thead><tr><th>Date</th><th>Tx</th><th className="num">Amount</th><th>Dir.</th><th>Channel</th><th>Counterparty</th><th>Reference</th><th>Source</th></tr></thead>
                <tbody>
                  {shown.map((t) => (
                    <tr key={t.txId} className={alertedIds.has(t.txId) && !onlyAlerted ? 'highlight' : undefined}>
                      <td className="mono small">{t.date}</td><td className="mono small">{t.txId}</td>
                      <td className="num">{t.direction === 'debit' ? '−' : ''}{money(t.amount)}</td><td>{t.direction === 'credit' ? 'In' : 'Out'}</td>
                      <td className="small">{t.channel.replace('_', ' ')}{t.branch ? <div className="muted">{t.branch}</div> : null}</td>
                      <td className="small">{t.counterparty}{t.counterpartyCountry !== 'CA' ? <span className="muted"> · {t.counterpartyCountry}</span> : null}</td>
                      <td className="mono small">{t.reference}</td>
                      <td className="small">{t.sourceSystem === 'MIGRATED_LEDGER' ? <span title="Loaded by migration">{t.migrationBatch} · run {t.loadRun}</span> : 'Core (live)'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <h3>Evidence panel</h3>
            <p className="small muted">Computed checks. Mark each item you reviewed — at least one is required to record a disposition.</p>
            {evidence.map((e) => (
              <div key={e.id} className={`evidence ${e.status}`}>
                <header>
                  <h4>{e.title}</h4>
                  <Badge tone={evTone(e.status)}>{evLabel(e.status)}</Badge>
                </header>
                <p>{e.summary}</p>
                {e.details.length > 0 && <ul>{e.details.map((d) => <li key={d}>{d}</li>)}</ul>}
                <label className="check small" style={{ marginTop: 8 }}>
                  <input type="checkbox" checked={reviewed.includes(e.id)} disabled={!!decision}
                    onChange={(ev) => setReviewed((r) => (ev.target.checked ? [...r, e.id] : r.filter((x) => x !== e.id)))} />
                  Reviewed
                </label>
              </div>
            ))}
          </div>

          <div className="card">
            <h3>Case notes</h3>
            {notes.length ? <ul className="small" style={{ paddingLeft: 18 }}>{notes.map((n, i) => <li key={i}><span className="mono muted">{n.at}</span> — {n.text}</li>)}</ul> : <p className="small muted">No notes yet.</p>}
            <div className="field">
              <label htmlFor="note">Add a note</label>
              <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Counterparties have no prior history; customer profile last refreshed 2025." style={{ minHeight: 64 }} />
            </div>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} disabled={!note.trim()} onClick={() => { onNote(alert.caseId, note.trim()); setNote(''); }}>Add note</button>
          </div>

          <div className="card">
            <h3>Disposition</h3>
            {decision ? (
              <div className="stack">
                <div className="callout">
                  <h4>{statusLabel(decision)}</h4>
                  <p className="small">Recorded {decision.recordedAt} by {decision.analyst}. Evidence reviewed: {decision.reviewedEvidenceIds.length} item(s).</p>
                  <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{decision.rationale}</p>
                </div>
                {scenario && (
                  <details className="disclosure" open>
                    <summary>Teaching note: how a reviewer might reason ({scenario.scenarioId})</summary>
                    <div className="body">
                      <p className="small">{scenario.reviewerReasoning}</p>
                      <p className="small muted" style={{ margin: 0 }}>Suggested proportionate step: <strong>{DISPOSITIONS.find((d) => d.code === scenario.suggestedDisposition)!.label}</strong>. This is guidance for discussion, not a ground truth — reasonable reviewers can differ, and real decisions follow an institution’s own procedures.</p>
                    </div>
                  </details>
                )}
                <div className="row">
                  <button className="btn btn-primary btn-sm" onClick={() => setShowReport(true)}>View / export narrative</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => onSave(alert.caseId, null)}>Reopen case</button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="stack" noValidate>
                <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack">
                  <legend className="small" style={{ fontWeight: 600, marginBottom: 6 }}>Decision</legend>
                  {DISPOSITIONS.map((d) => {
                    const disabled = d.code === 'CLOSE_EXPLAINED_EXCEPTION' && !eligibility.allowed;
                    return (
                      <label key={d.code} className="radio-card">
                        <input type="radio" name="disp" value={d.code} checked={code === d.code} disabled={disabled} onChange={() => setCode(d.code)} />
                        <span><strong>{d.label}</strong><span>{disabled ? `Unavailable — ${eligibility.reason}` : d.help}</span></span>
                      </label>
                    );
                  })}
                </fieldset>
                <div className="field">
                  <label htmlFor="rationale">Rationale (refer to the evidence)</label>
                  <textarea id="rationale" value={rationale} onChange={(e) => setRationale(e.target.value)} aria-describedby="rationale-help" />
                  <span id="rationale-help" className="small muted">{rationale.trim().length}/{MIN_RATIONALE_CHARS} characters minimum</span>
                </div>
                <div className="field">
                  <label htmlFor="analyst">Your name (shown on the demo report)</label>
                  <input id="analyst" type="text" value={analyst} onChange={(e) => setAnalyst(e.target.value)} />
                </div>
                {errors.length > 0 && (
                  <div className="callout bad" role="alert"><h4>Can’t record this yet</h4><ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{errors.map((e) => <li key={e}>{e}</li>)}</ul></div>
                )}
                <button type="submit" className="btn btn-primary">Record disposition</button>
                <p className="small muted" style={{ margin: 0 }}>Saved only in this browser. The simulation validates that a decision is reasoned and supported; it does not decide the outcome.</p>
              </form>
            )}
          </div>
        </div>
      </div>

      {showReport && (
        <Modal title={`Case narrative — ${alert.caseId}`} onClose={() => setShowReport(false)} actions={<>
          <button className="btn btn-secondary btn-sm" onClick={() => downloadText(`${alert.caseId}-SIMULATION-narrative.md`, narrative(), 'text/markdown')}>Download .md</button>
          <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>Print / save PDF</button>
        </>}>
          <div className="report">{narrative()}</div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function RulesView() {
  const { alerts } = aml();
  const testNames = [...amlTestsSrc.matchAll(/test\(\s*[`'"]([^`'"]+)[`'"]/g)].map((m) => m[1].replace(/\$\{[^}]+\}/g, '…'));
  return (
    <div className="stack">
      <div className="callout info">
        <h4>Design principles</h4>
        <p className="small">Deterministic, explainable rules; every hit carries the observed value, the threshold and the transactions involved. Weights only order the queue. Thresholds are illustrative and not calibrated on real data. Bands: High ≥ {BAND_THRESHOLDS.high}, Medium ≥ {BAND_THRESHOLDS.medium}; modifiers +10 for KYC not verified, +10/+5 for high/medium customer risk rating.</p>
      </div>
      {RULE_CATALOG.map((r) => (
        <details key={r.id} className="disclosure">
          <summary><span>{r.name} <span className="mono small muted">{r.id}</span></span><span className="row" style={{ gap: 6 }}><Badge>{r.category}</Badge><Badge tone="blue">weight {r.weight}</Badge><Badge tone="amber">{alerts.filter((a) => a.hits.some((h) => h.ruleId === r.id)).length} alerts</Badge></span></summary>
          <div className="body stack">
            <dl className="dl"><dt>Logic</dt><dd>{r.logic}</dd><dt>Why it matters</dt><dd>{r.why}</dd><dt>Limitations</dt><dd>{r.limitations}</dd></dl>
            <CodeBlock title={`src/engine/aml/rules.ts · ${FN_FOR_RULE[r.id]}()`} code={extractBlock(rulesSrc, FN_FOR_RULE[r.id])} />
          </div>
        </details>
      ))}
      <details className="disclosure">
        <summary>Scoring, evidence and data-correction logic</summary>
        <div className="body stack">
          <CodeBlock title="src/engine/aml/alerts.ts · scoreAlert()" code={extractBlock(alertsSrc, 'scoreAlert')} />
          <CodeBlock title="src/engine/aml/alerts.ts · correctedTransactions()" code={extractBlock(alertsSrc, 'correctedTransactions')} />
          <CodeBlock title="src/engine/aml/disposition.ts · validateDisposition()" code={extractBlock(dispositionSrc, 'validateDisposition')} />
        </div>
      </details>
      <div className="card">
        <h3>Automated tests ({testNames.length})</h3>
        <p className="small muted">From <span className="mono">tests/aml.test.ts</span>, run with <span className="mono">npm test</span> (Node’s built-in test runner). All passing at the time of publishing — see the build status page.</p>
        <ul className="small two-col" style={{ paddingLeft: 18, margin: 0 }}>{testNames.map((t, i) => <li key={i}>{t}</li>)}</ul>
      </div>
      <SqlPanel file="aml_rules.sql" intro="The same rules expressed in SQL. scripts/check_sql.py runs these against SQLite and asserts they flag exactly the customers the TypeScript rules flag." />
    </div>
  );
}

// ---------------------------------------------------------------------------
function DataView() {
  const { ds, alerts } = aml();
  return (
    <div className="stack">
      <div className="kpis">
        <Kpi label="Seed" value={<span className="mono">{ds.seed}</span>} sub="mulberry32 PRNG" />
        <Kpi label="Customers" value={ds.customers.length} sub={`${ds.customers.filter((c) => c.scenarioId).length} scenario, ${ds.customers.filter((c) => !c.scenarioId).length} baseline`} />
        <Kpi label="Transactions" value={count(ds.transactions.length)} sub={`${ds.periodStart} → ${ds.periodEnd}`} />
        <Kpi label="Migration batches" value={ds.migrationBatches.length} sub={ds.migrationBatches.map((b) => `${b.batchId}: ${b.rowCount} rows`).join(' · ')} />
      </div>
      <div className="card">
        <h3>Documented scenarios</h3>
        <p className="small muted">Baseline customers are generated inside their declared profile; a test asserts that none of them alert. Each scenario injects a specific pattern.</p>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>ID</th><th>Scenario</th><th>Customer</th><th>Rules it triggers</th><th>Case</th></tr></thead>
            <tbody>
              {SCENARIOS.map((s) => {
                const a = alerts.find((x) => x.customerId === s.customerId);
                return (
                  <tr key={s.scenarioId}>
                    <td className="mono">{s.scenarioId}</td>
                    <td><strong>{s.title}</strong><div className="small muted">{s.description}</div></td>
                    <td className="small">{ds.customers.find((c) => c.customerId === s.customerId)!.name}<div className="mono muted">{s.customerId}</div></td>
                    <td className="small mono">{s.expectedRules.map((r) => r.split('_')[0]).join(', ')}</td>
                    <td>{a && <Link to="/labs/aml" query={{ tab: 'case', case: a.caseId }} className="mono">{a.caseId}</Link>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <h3>Download the data</h3>
        <p className="small">Run the rules yourself in Excel, SQL or Python. Field definitions are in the <Link to="/data-dictionary">data dictionary</Link>.</p>
        <div className="row">
          <a className="btn btn-secondary btn-sm" href="data/customer.csv" download>customer.csv</a>
          <a className="btn btn-secondary btn-sm" href="data/txn.csv" download>txn.csv</a>
          <a className="btn btn-secondary btn-sm" href="data/erp_document.csv" download>erp_document.csv</a>
          <a className="btn btn-secondary btn-sm" href="data/seed_sqlite.sql" download>seed_sqlite.sql (all labs)</a>
        </div>
      </div>
    </div>
  );
}
