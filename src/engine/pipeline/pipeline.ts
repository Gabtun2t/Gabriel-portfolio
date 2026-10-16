/**
 * Financial data pipeline: ingest → standardize → validate → deduplicate → transform → model → metrics.
 * Every stage is a pure function, so row counts and metrics are reproducible and testable,
 * and every fact row carries the raw record IDs it came from (lineage).
 */
import { DIM_CUSTOMER, ERP_XREF, FX_TO_CAD, MERCHANT_XREF, PAYER_XREF, type RawRecord, type SourceName } from '../../data/pipeline/generate';
import { canonicalJson } from '../../lib/sha256';
import { fingerprint } from '../../lib/prng';

export const PERIOD = { start: '2026-04-01', end: '2026-06-30' };

export interface StagedRecord {
  rawId: string;
  source: SourceName;
  ingestedAt: string;
  naturalKey: string;
  txnDate: string | null;
  sourceCustomerId: string;
  customerKey: string | null;
  amount: number | null;
  currency: string;
  channel: 'Card' | 'EFT' | 'AR receipt';
  parseNotes: string[];
  /** Required source fields that were delivered empty. */
  missingFields: string[];
}

/** Stage 2 – map each source's shape onto one canonical record. */
export function standardize(r: RawRecord): StagedRecord {
  const p = r.payload;
  const notes: string[] = [];
  const required: Record<SourceName, string[]> = {
    card_settlement: ['settlement_id', 'txn_ts', 'merchant_id', 'amount', 'currency'],
    eft_receipts: ['trace_no', 'value_date', 'payer_account', 'amount_cents', 'currency'],
    erp_ar_receipts: ['doc_no', 'receipt_date', 'customer_code', 'amount', 'currency_code'],
  };
  const missingFields = required[r.source].filter((f) => !p[f]);
  const isoOrNull = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T00:00:00Z')) && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v ? v : null);
  if (r.source === 'card_settlement') {
    const d = isoOrNull(p.txn_ts.slice(0, 10));
    if (!d) notes.push(`txn_ts “${p.txn_ts}” is not a valid ISO timestamp`);
    return { rawId: r.rawId, source: r.source, ingestedAt: r.ingestedAt, naturalKey: `card_settlement:${p.settlement_id}`, txnDate: d, sourceCustomerId: p.merchant_id, customerKey: MERCHANT_XREF[p.merchant_id] ?? null, amount: p.amount === '' ? null : Number(p.amount), currency: p.currency, channel: 'Card', parseNotes: notes, missingFields };
  }
  if (r.source === 'eft_receipts') {
    const d = isoOrNull(p.value_date);
    if (!d) notes.push(`value_date “${p.value_date}” is not a valid ISO date`);
    const cents = p.amount_cents === '' ? null : Number(p.amount_cents);
    return { rawId: r.rawId, source: r.source, ingestedAt: r.ingestedAt, naturalKey: `eft_receipts:${p.trace_no}`, txnDate: d, sourceCustomerId: p.payer_account, customerKey: PAYER_XREF[p.payer_account] ?? null, amount: cents === null ? null : cents / 100, currency: p.currency, channel: 'EFT', parseNotes: notes, missingFields };
  }
  // erp_ar_receipts: DD/MM/YYYY
  let d: string | null = null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(p.receipt_date);
  if (m) d = isoOrNull(`${m[3]}-${m[2]}-${m[1]}`);
  if (!d) notes.push(`receipt_date “${p.receipt_date}” is not a valid DD/MM/YYYY date`);
  return { rawId: r.rawId, source: r.source, ingestedAt: r.ingestedAt, naturalKey: `erp_ar_receipts:${p.doc_no}`, txnDate: d, sourceCustomerId: p.customer_code, customerKey: ERP_XREF[p.customer_code] ?? null, amount: p.amount === '' ? null : Number(p.amount), currency: p.currency_code, channel: 'AR receipt', parseNotes: notes, missingFields };
}

export type ValidationRuleId = 'V1_REQUIRED' | 'V2_DATE' | 'V3_AMOUNT' | 'V4_CURRENCY' | 'V5_CUSTOMER';

export const VALIDATION_RULES: { id: ValidationRuleId; name: string; dimension: 'Completeness' | 'Validity' | 'Integrity'; test: (r: StagedRecord) => string | null }[] = [
  { id: 'V1_REQUIRED', name: 'Required fields present', dimension: 'Completeness', test: (r) => (r.missingFields.length ? `empty required field(s): ${r.missingFields.join(', ')}` : null) },
  { id: 'V2_DATE', name: 'Valid date inside the reporting period', dimension: 'Validity', test: (r) => (r.missingFields.some((f) => /date|ts/.test(f)) ? null : !r.txnDate ? r.parseNotes[0] ?? 'date missing' : r.txnDate < PERIOD.start || r.txnDate > PERIOD.end ? `date ${r.txnDate} is outside ${PERIOD.start}…${PERIOD.end}` : null) },
  { id: 'V3_AMOUNT', name: 'Amount is a positive number', dimension: 'Validity', test: (r) => (r.amount !== null && !(r.amount > 0) ? `amount ${r.amount} is not positive` : null) },
  { id: 'V4_CURRENCY', name: 'Currency has an FX rate', dimension: 'Validity', test: (r) => (!FX_TO_CAD[r.currency] ? `currency “${r.currency}” has no FX rate` : null) },
  { id: 'V5_CUSTOMER', name: 'Customer resolves in dim_customer', dimension: 'Integrity', test: (r) => (r.sourceCustomerId && !r.customerKey ? `“${r.sourceCustomerId}” is not in the cross-reference` : null) },
];

export interface QuarantinedRecord { record: StagedRecord; failures: { ruleId: ValidationRuleId; message: string }[] }

export function validate(records: StagedRecord[], enabled: Set<ValidationRuleId>) {
  const passed: StagedRecord[] = [];
  const quarantined: QuarantinedRecord[] = [];
  for (const r of records) {
    const failures = VALIDATION_RULES.filter((v) => enabled.has(v.id)).map((v) => ({ ruleId: v.id, message: v.test(r) })).filter((f): f is { ruleId: ValidationRuleId; message: string } => f.message !== null);
    if (failures.length) quarantined.push({ record: r, failures });
    else passed.push(r);
  }
  return { passed, quarantined };
}

export interface DedupResult {
  kept: (StagedRecord & { lineageRawIds: string[] })[];
  exactDuplicates: { dropped: string; keptRawId: string }[];
  keyDuplicates: { dropped: string; keptRawId: string; naturalKey: string }[];
}

/** Stage 4 – D1: identical content delivered twice (keep first). D2: same natural key, keep the latest delivery. */
export function deduplicate(records: StagedRecord[], raw: RawRecord[]): DedupResult {
  const content = (r: StagedRecord) => fingerprint(canonicalJson(raw.find((x) => x.rawId === r.rawId)!.payload) + r.source);
  const byContent = new Map<string, StagedRecord & { lineageRawIds: string[] }>();
  const exactDuplicates: DedupResult['exactDuplicates'] = [];
  for (const r of records) {
    const k = content(r);
    const prior = byContent.get(k);
    if (prior) { exactDuplicates.push({ dropped: r.rawId, keptRawId: prior.rawId }); prior.lineageRawIds.push(r.rawId); continue; }
    byContent.set(k, { ...r, lineageRawIds: [r.rawId] });
  }
  const byKey = new Map<string, StagedRecord & { lineageRawIds: string[] }>();
  const keyDuplicates: DedupResult['keyDuplicates'] = [];
  for (const r of byContent.values()) {
    const prior = byKey.get(r.naturalKey);
    if (!prior) { byKey.set(r.naturalKey, r); continue; }
    const [latest, older] = r.ingestedAt > prior.ingestedAt ? [r, prior] : [prior, r];
    keyDuplicates.push({ dropped: older.rawId, keptRawId: latest.rawId, naturalKey: r.naturalKey });
    latest.lineageRawIds = [...latest.lineageRawIds, ...older.lineageRawIds];
    byKey.set(r.naturalKey, latest);
  }
  return { kept: [...byKey.values()], exactDuplicates, keyDuplicates };
}

export interface FactPayment {
  paymentKey: string;
  dateKey: string;
  month: string;
  customerKey: string | null;
  segment: string;
  channel: string;
  currency: string;
  amountOriginal: number;
  fxRate: number | null;
  amountCad: number | null;
  naturalKey: string;
  lineageRawIds: string[];
}

/** Stages 5–6 – currency conversion, conformed dimensions, star-schema fact rows. */
export function transform(records: DedupResult['kept']): FactPayment[] {
  return records
    .map((r) => {
      const month = (r.txnDate ?? 'unknown').slice(0, 7);
      const fx = FX_TO_CAD[r.currency]?.[month] ?? null;
      const cust = DIM_CUSTOMER.find((c) => c.customerKey === r.customerKey);
      return {
        paymentKey: '', dateKey: r.txnDate ?? 'unknown', month, customerKey: r.customerKey, segment: cust?.segment ?? 'Unknown',
        channel: r.channel, currency: r.currency, amountOriginal: r.amount ?? 0, fxRate: fx,
        amountCad: fx === null || r.amount === null ? null : Math.round(r.amount * fx * 100) / 100,
        naturalKey: r.naturalKey, lineageRawIds: r.lineageRawIds,
      };
    })
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.naturalKey.localeCompare(b.naturalKey))
    .map((f, i) => ({ ...f, paymentKey: `F-${String(i + 1).padStart(5, '0')}` }));
}

export interface PipelineRun {
  counts: { stage: string; rows: number; note: string }[];
  staged: StagedRecord[];
  quarantined: QuarantinedRecord[];
  dedup: DedupResult;
  facts: FactPayment[];
  metrics: {
    monthlyByChannel: { month: string; channel: string; amountCad: number; count: number }[];
    totalCad: number;
    unconverted: number;
    rejectionsByRule: Record<ValidationRuleId, number>;
    dq: { completeness: number; validity: number; uniqueness: number; integrity: number };
  };
}

export function runPipeline(raw: RawRecord[], enabledRules: Set<ValidationRuleId> = new Set(VALIDATION_RULES.map((v) => v.id))): PipelineRun {
  const staged = raw.map(standardize);
  const { passed, quarantined } = validate(staged, enabledRules);
  const dedup = deduplicate(passed, raw);
  const facts = transform(dedup.kept);

  const rejectionsByRule = Object.fromEntries(VALIDATION_RULES.map((v) => [v.id, 0])) as Record<ValidationRuleId, number>;
  quarantined.forEach((q) => q.failures.forEach((f) => rejectionsByRule[f.ruleId]++));

  // DQ dimensions are measured on ALL staged records with ALL rules, independent of toggles, so they describe the data — not the configuration.
  const all = (id: ValidationRuleId) => staged.filter((r) => VALIDATION_RULES.find((v) => v.id === id)!.test(r) === null).length / staged.length;
  const dupCount = deduplicate(staged, raw);
  const uniqueness = (staged.length - dupCount.exactDuplicates.length - dupCount.keyDuplicates.length) / staged.length;

  const agg = new Map<string, { month: string; channel: string; amountCad: number; count: number }>();
  for (const f of facts) {
    if (f.amountCad === null) continue;
    const k = `${f.month}|${f.channel}`;
    const e = agg.get(k) ?? { month: f.month, channel: f.channel, amountCad: 0, count: 0 };
    e.amountCad = Math.round((e.amountCad + f.amountCad) * 100) / 100;
    e.count++;
    agg.set(k, e);
  }

  return {
    counts: [
      { stage: 'Ingest', rows: raw.length, note: 'Raw deliveries from 3 sources' },
      { stage: 'Standardize', rows: staged.length, note: 'Mapped to one canonical shape' },
      { stage: 'Validate', rows: passed.length, note: `${quarantined.length} quarantined` },
      { stage: 'Deduplicate', rows: dedup.kept.length, note: `${dedup.exactDuplicates.length} exact + ${dedup.keyDuplicates.length} key duplicates removed` },
      { stage: 'Model', rows: facts.length, note: 'fact_payment rows' },
    ],
    staged, quarantined, dedup, facts,
    metrics: {
      monthlyByChannel: [...agg.values()].sort((a, b) => a.month.localeCompare(b.month) || a.channel.localeCompare(b.channel)),
      totalCad: Math.round(facts.reduce((s, f) => s + (f.amountCad ?? 0), 0) * 100) / 100,
      unconverted: facts.filter((f) => f.amountCad === null).length,
      rejectionsByRule,
      dq: {
        completeness: all('V1_REQUIRED'),
        validity: staged.filter((r) => ['V2_DATE', 'V3_AMOUNT', 'V4_CURRENCY'].every((id) => VALIDATION_RULES.find((v) => v.id === id)!.test(r) === null)).length / staged.length,
        uniqueness,
        integrity: all('V5_CUSTOMER'),
      },
    },
  };
}

export function traceFact(run: PipelineRun, raw: RawRecord[], paymentKey: string) {
  const f = run.facts.find((x) => x.paymentKey === paymentKey);
  if (!f) return null;
  return { fact: f, raw: f.lineageRawIds.map((id) => raw.find((r) => r.rawId === id)!), staged: run.staged.filter((s) => f.lineageRawIds.includes(s.rawId)) };
}
