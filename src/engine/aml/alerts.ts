/**
 * Alert generation, explainable scoring and evidence checks.
 */
import type { AmlDataset, Customer, Transaction } from '../../data/aml/types';
import { evaluateCustomer, ruleById, type RuleHit, type RuleId } from './rules';
import { daysBetween } from '../../lib/dates';

export type RiskBand = 'High' | 'Medium' | 'Low';

export interface ScoreComponent {
  label: string;
  points: number;
}

export interface Alert {
  alertId: string;
  caseId: string;
  customerId: string;
  createdOn: string;
  hits: RuleHit[];
  primaryCategory: string;
  score: number;
  band: RiskBand;
  scoreBreakdown: ScoreComponent[];
  /** Total value of distinct transactions referenced by the hits. */
  involvedAmount: number;
}

export const BAND_THRESHOLDS = { high: 60, medium: 35 } as const;

export function bandFor(score: number): RiskBand {
  if (score >= BAND_THRESHOLDS.high) return 'High';
  if (score >= BAND_THRESHOLDS.medium) return 'Medium';
  return 'Low';
}

export function scoreAlert(c: Customer, hits: RuleHit[]): { score: number; breakdown: ScoreComponent[] } {
  const breakdown: ScoreComponent[] = hits.map((h) => ({ label: `Rule ${ruleById(h.ruleId).name}`, points: ruleById(h.ruleId).weight }));
  if (c.kycStatus !== 'verified') breakdown.push({ label: `KYC status: ${c.kycStatus.replace('_', ' ')}`, points: 10 });
  if (c.riskRating === 'high') breakdown.push({ label: 'Customer risk rating: high', points: 10 });
  if (c.riskRating === 'medium') breakdown.push({ label: 'Customer risk rating: medium', points: 5 });
  const raw = breakdown.reduce((s, b) => s + b.points, 0);
  return { score: Math.min(100, raw), breakdown };
}

export function runDetection(ds: AmlDataset): Alert[] {
  const alerts: Alert[] = [];
  const byCustomer = groupByCustomer(ds.transactions);
  for (const c of ds.customers) {
    const txs = byCustomer.get(c.customerId) ?? [];
    const hits = evaluateCustomer(c, txs);
    if (!hits.length) continue;
    const { score, breakdown } = scoreAlert(c, hits);
    const primary = hits.reduce((m, h) => (ruleById(h.ruleId).weight > ruleById(m.ruleId).weight ? h : m));
    const ids = new Set(hits.flatMap((h) => h.txIds));
    const involvedAmount = txs.filter((t) => ids.has(t.txId)).reduce((s, t) => s + t.amount, 0);
    const lastDate = hits.map((h) => h.windowEnd).sort().at(-1)!;
    alerts.push({
      alertId: '', caseId: '', customerId: c.customerId,
      createdOn: lastDate > ds.periodEnd ? ds.periodEnd : lastDate,
      hits, primaryCategory: ruleById(primary.ruleId).category,
      score, band: bandFor(score), scoreBreakdown: breakdown,
      involvedAmount: Math.round(involvedAmount * 100) / 100,
    });
  }
  alerts.sort((a, b) => a.createdOn.localeCompare(b.createdOn) || a.customerId.localeCompare(b.customerId));
  alerts.forEach((a, i) => {
    a.alertId = `ALR-${String(i + 1).padStart(4, '0')}`;
    a.caseId = `CASE-26${String(i + 101).padStart(4, '0')}`;
  });
  return alerts;
}

export function groupByCustomer(txs: Transaction[]): Map<string, Transaction[]> {
  const m = new Map<string, Transaction[]>();
  for (const t of txs) m.set(t.customerId, [...(m.get(t.customerId) ?? []), t]);
  return m;
}

// ---------------------------------------------------------------------------
// Evidence checks
// ---------------------------------------------------------------------------

export type EvidenceStatus = 'ok' | 'attention' | 'data_issue' | 'info';

export interface EvidenceItem {
  id: string;
  title: string;
  status: EvidenceStatus;
  summary: string;
  details: string[];
}

/**
 * Apply data corrections that are *supported by evidence in the dataset itself*:
 * - drop rows whose (reference, amount, counterparty) already appeared in an earlier load run of a batch with a logged duplicate defect;
 * - replace migrated amounts with the source ERP document amount where they differ.
 * Used for the "re-evaluate with corrected data" check. It never removes live (CORE_LIVE) activity.
 */
export function correctedTransactions(ds: AmlDataset, txs: Transaction[]): { txs: Transaction[]; changes: string[] } {
  const changes: string[] = [];
  const dupDefectBatches = new Set(ds.migrationBatches.filter((b) => b.knownDefects.some((d) => d.field === 'load_run')).map((b) => b.batchId));
  const seen = new Set<string>();
  const out: Transaction[] = [];
  for (const t of [...txs].sort((a, b) => (a.loadRun ?? 0) - (b.loadRun ?? 0))) {
    if (t.sourceSystem === 'MIGRATED_LEDGER' && t.migrationBatch && dupDefectBatches.has(t.migrationBatch)) {
      const key = `${t.reference}|${t.amount}|${t.counterparty}|${t.direction}`;
      if (seen.has(key) && (t.loadRun ?? 1) > 1) {
        changes.push(`Removed ${t.txId} (${t.reference}, load run ${t.loadRun}) — duplicate of an earlier load run in ${t.migrationBatch}.`);
        continue;
      }
      seen.add(key);
    }
    const doc = ds.erpDocuments.find((d) => d.reference === t.reference && d.customerId === t.customerId);
    if (t.sourceSystem === 'MIGRATED_LEDGER' && doc && Math.abs(doc.erpAmount - t.amount) > 0.005) {
      changes.push(`Replaced amount of ${t.txId} (${t.reference}) ${t.amount.toFixed(2)} → ${doc.erpAmount.toFixed(2)} from source document ${doc.erpDocId}.`);
      out.push({ ...t, amount: doc.erpAmount });
      continue;
    }
    out.push(t);
  }
  return { txs: out.sort((a, b) => a.txId.localeCompare(b.txId)), changes };
}

export function buildEvidence(ds: AmlDataset, alert: Alert): EvidenceItem[] {
  const c = ds.customers.find((x) => x.customerId === alert.customerId)!;
  const txs = ds.transactions.filter((t) => t.customerId === c.customerId);
  const involved = new Set(alert.hits.flatMap((h) => h.txIds));
  const items: EvidenceItem[] = [];

  // 1. KYC currency
  const kycAge = daysBetween(c.kycLastReview, ds.asOf);
  items.push({
    id: 'kyc', title: 'KYC review currency',
    status: c.kycStatus === 'verified' ? 'ok' : 'attention',
    summary: c.kycStatus === 'verified' ? `Last reviewed ${c.kycLastReview} (${kycAge} days ago).` : `KYC ${c.kycStatus.replace('_', ' ')} — last reviewed ${c.kycLastReview} (${kycAge} days ago).`,
    details: [`Account opened ${c.accountOpened}.`, `Declared activity: ${c.activity}.`, `Declared purpose: ${c.accountPurpose}.`],
  });

  // 2. Expected vs actual activity
  const months = ['2026-04', '2026-05', '2026-06'];
  const rows = months.map((m) => {
    const credits = txs.filter((t) => t.date.startsWith(m) && t.direction === 'credit');
    const all = txs.filter((t) => t.date.startsWith(m));
    return { m, credits: credits.reduce((s, t) => s + t.amount, 0), n: all.length };
  });
  const maxRatio = Math.max(...rows.map((r) => r.credits / c.declaredMonthlyTurnover));
  items.push({
    id: 'profile', title: 'Expected vs. actual activity',
    status: maxRatio >= 3 ? 'attention' : 'ok',
    summary: `Declared ≈$${c.declaredMonthlyTurnover.toLocaleString('en-CA')} credits and ≈${c.expectedMonthlyTxCount} transactions per month. Peak month is ${maxRatio.toFixed(1)}× declared credits.`,
    details: rows.map((r) => `${r.m}: credits $${r.credits.toLocaleString('en-CA', { maximumFractionDigits: 0 })} (${(r.credits / c.declaredMonthlyTurnover).toFixed(1)}×), ${r.n} transactions`),
  });

  // 3. Data lineage of the alerted transactions
  const involvedTxs = txs.filter((t) => involved.has(t.txId));
  const migrated = involvedTxs.filter((t) => t.sourceSystem === 'MIGRATED_LEDGER');
  const batches = [...new Set(migrated.map((t) => t.migrationBatch!))];
  const defects = ds.migrationBatches.filter((b) => batches.includes(b.batchId)).flatMap((b) => b.knownDefects.map((d) => `${b.batchId} · ${d.defectId}: ${d.description}`));
  items.push({
    id: 'lineage', title: 'Data lineage of alerted transactions',
    status: defects.length ? 'data_issue' : 'info',
    summary: migrated.length
      ? `${migrated.length} of ${involvedTxs.length} alerted transactions were loaded by migration batch(es) ${batches.join(', ')}${defects.length ? ', which have logged defects' : ''}.`
      : `All ${involvedTxs.length} alerted transactions come from the live core system (no migration involvement).`,
    details: defects.length ? defects : ['No known data defects apply to these rows.'],
  });

  // 4. Duplicate check
  const dupKey = (t: Transaction) => `${t.reference}|${t.amount.toFixed(2)}|${t.counterparty}|${t.direction}`;
  const keyCount = new Map<string, Transaction[]>();
  for (const t of txs) keyCount.set(dupKey(t), [...(keyCount.get(dupKey(t)) ?? []), t]);
  const dups = [...keyCount.values()].filter((g) => g.length > 1);
  items.push({
    id: 'duplicates', title: 'Duplicate posting check',
    status: dups.length ? 'data_issue' : 'ok',
    summary: dups.length ? `${dups.length} reference(s) posted more than once.` : 'No identical postings found for this customer.',
    details: dups.map((g) => `${g[0].reference}: ${g.map((t) => `${t.txId} (${t.migrationBatch ?? t.sourceSystem}, load run ${t.loadRun ?? '–'})`).join(' vs ')}`),
  });

  // 5. Source ERP cross-check
  const checks = involvedTxs
    .map((t) => ({ t, doc: ds.erpDocuments.find((d) => d.reference === t.reference && d.customerId === t.customerId) }))
    .filter((x) => x.doc);
  const mismatches = checks.filter((x) => Math.abs(x.doc!.erpAmount - x.t.amount) > 0.005);
  items.push({
    id: 'erp', title: 'Source ERP document cross-check',
    status: mismatches.length ? 'data_issue' : checks.length ? 'ok' : 'info',
    summary: !checks.length
      ? 'No source ERP documents apply to the alerted transactions.'
      : mismatches.length
        ? `${mismatches.length} amount mismatch(es) between the monitored ledger and the source ERP document.`
        : `${checks.length} alerted transaction(s) agree with the source ERP document.`,
    details: mismatches.map(({ t, doc }) => {
      const ratio = t.amount / doc!.erpAmount;
      return `${t.reference}: ledger $${t.amount.toLocaleString('en-CA', { minimumFractionDigits: 2 })} vs ERP ${doc!.erpDocId} $${doc!.erpAmount.toLocaleString('en-CA', { minimumFractionDigits: 2 })} (ratio ${ratio.toFixed(2)}${Math.abs(ratio - 100) < 1e-9 ? ' — consistent with a decimal-scale defect' : ''})`;
    }),
  });

  // 6. Counterparty analysis
  const cps = new Map<string, { n: number; total: number; countries: Set<string> }>();
  for (const t of involvedTxs) {
    const e = cps.get(t.counterparty) ?? { n: 0, total: 0, countries: new Set<string>() };
    e.n++; e.total += t.amount; e.countries.add(t.counterpartyCountry);
    cps.set(t.counterparty, e);
  }
  const historyBefore = (cp: string, first: string) => txs.some((t) => t.counterparty === cp && t.date < first && !involved.has(t.txId));
  const firstDate = involvedTxs.map((t) => t.date).sort()[0];
  const newCps = [...cps.keys()].filter((cp) => !historyBefore(cp, firstDate));
  items.push({
    id: 'counterparties', title: 'Counterparty analysis',
    status: newCps.length > 2 ? 'attention' : 'info',
    summary: `${cps.size} counterparties in the alerted activity; ${newCps.length} have no earlier history with this customer.`,
    details: [...cps.entries()].slice(0, 8).map(([cp, e]) => `${cp} — ${e.n} txn, $${e.total.toLocaleString('en-CA', { maximumFractionDigits: 0 })}, ${[...e.countries].join('/')}${newCps.includes(cp) ? ' · new' : ''}`),
  });

  // 7. Documents on file
  items.push({
    id: 'documents', title: 'Documents and requests on file',
    status: c.documents.some((d) => d.explainsRules.length) ? 'info' : c.documents.some((d) => d.type === 'rfi_sent') ? 'attention' : 'info',
    summary: c.documents.length ? `${c.documents.length} document(s) on file.` : 'No supporting documents on file.',
    details: c.documents.map((d) => `${d.date} · ${d.docId} (${d.type.replace('_', ' ')}): ${d.summary}${d.explainsRules.length ? ` [explains: ${d.explainsRules.join(', ')}]` : ''}`),
  });

  // 8. Re-evaluate on corrected data
  const corrected = correctedTransactions(ds, txs);
  const reHits = corrected.changes.length ? evaluateCustomer(c, corrected.txs) : null;
  items.push({
    id: 'reevaluate', title: 'Re-evaluate with evidence-supported data corrections',
    status: !corrected.changes.length ? 'info' : reHits!.length ? 'attention' : 'data_issue',
    summary: !corrected.changes.length
      ? 'No data corrections are supported by the evidence — the alert stands on the recorded activity.'
      : reHits!.length
        ? `After ${corrected.changes.length} correction(s), ${reHits!.length} rule(s) still fire: ${reHits!.map((h) => h.ruleId).join(', ')}.`
        : `After ${corrected.changes.length} correction(s), no rule fires. The alert appears attributable to the data defect(s).`,
    details: corrected.changes,
  });

  return items;
}

/** Rules that are explained by at least one document on file. */
export function explainedRules(c: Customer): Set<RuleId> {
  return new Set(c.documents.flatMap((d) => d.explainsRules as RuleId[]));
}
