/**
 * Export every synthetic dataset to CSV and to a single SQLite load script, plus the
 * TypeScript engine results that scripts/check_sql.py compares against.
 *
 *   npm run seed
 *
 * Outputs (all deterministic):
 *   data/*.csv                      one file per table
 *   data/seed_sqlite.sql            schema + INSERTs (sqlite3 portfolio.db < data/seed_sqlite.sql)
 *   data/expected/*.json            engine outputs used by the SQL parity check
 *   public/data/*                   copies served by the website for download
 */
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { generateAmlDataset } from '../src/data/aml/generate';
import { runDetection } from '../src/engine/aml/alerts';
import { generateReconDataset, GL_MAPPING } from '../src/data/recon/generate';
import { reconcile } from '../src/engine/recon/match';
import { generatePipelineDataset, DIM_CUSTOMER } from '../src/data/pipeline/generate';
import { runPipeline } from '../src/engine/pipeline/pipeline';
import { r1HighVelocity, r2LargeVsProfile, r3CashJustBelowThreshold, r4InflowExceedsProfile, r5DuplicatePosting } from '../src/engine/aml/rules';
import { groupByCustomer } from '../src/engine/aml/alerts';

const root = join(import.meta.dirname, '..');
const out = join(root, 'data');
mkdirSync(join(out, 'expected'), { recursive: true });
mkdirSync(join(root, 'public', 'data'), { recursive: true });

type Row = Record<string, string | number | boolean | null>;

const csvCell = (v: Row[string]) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const sqlCell = (v: Row[string]) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : typeof v === 'boolean' ? (v ? '1' : '0') : `'${String(v).replace(/'/g, "''")}'`);

const tables: { name: string; rows: Row[] }[] = [];
const add = (name: string, rows: Row[]) => {
  tables.push({ name, rows });
  const cols = Object.keys(rows[0]);
  writeFileSync(join(out, `${name}.csv`), [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n');
};

// ---- AML ----
const aml = generateAmlDataset();
add('customer', aml.customers.map((c) => ({
  customer_id: c.customerId, name: c.name, customer_type: c.type, segment: c.segment, activity: c.activity, account_purpose: c.accountPurpose,
  declared_monthly_turnover: c.declaredMonthlyTurnover, expected_monthly_tx_count: c.expectedMonthlyTxCount, international_expected: c.internationalExpected ? 1 : 0,
  account_id: c.accountId, account_opened: c.accountOpened, kyc_status: c.kycStatus, kyc_last_review: c.kycLastReview, risk_rating: c.riskRating,
})));
add('txn', aml.transactions.map((t) => ({
  tx_id: t.txId, customer_id: t.customerId, account_id: t.accountId, tx_date: t.date, amount: t.amount, direction: t.direction, channel: t.channel,
  counterparty: t.counterparty, counterparty_country: t.counterpartyCountry, reference: t.reference, branch: t.branch, source_system: t.sourceSystem,
  migration_batch: t.migrationBatch, load_run: t.loadRun,
})));
add('erp_document', aml.erpDocuments.map((d) => ({ reference: d.reference, customer_id: d.customerId, erp_amount: d.erpAmount, erp_doc_id: d.erpDocId })));

// ---- Reconciliation ----
const rec = generateReconDataset();
add('legacy_extract', rec.source.map((s) => ({ src_id: s.srcId, extract_row: s.extractRow, posting_date: s.postingDate, customer_id: s.customerId, segment: s.segment, reference: s.reference, amount: s.amount, description: s.description })));
add('erp_gl_entry', rec.target.map((t) => ({
  je_id: t.jeId, posting_date: t.postingDate, gl_account: t.glAccount, reference: t.reference, amount: t.amount, customer_id: t.customerId, migration_batch: t.migrationBatch,
  load_run: t.loadRun, staging_row_id: t.stagingRowId, entry_type: t.entryType, status: t.status, description: t.description,
})));
add('gl_mapping', GL_MAPPING.map((m) => ({ segment: m.segment, gl_account: m.glAccount, gl_name: m.glName })));
add('staging_log', rec.staging.map((s) => ({ staging_row_id: s.stagingRowId, src_id: s.srcId, extract_row: s.extractRow, mapping_version: s.mappingVersion, load_status: s.loadStatus, reject_reason: s.rejectReason, load_runs: s.loadRuns.join(',') })));

// ---- Pipeline ----
const pipe = generatePipelineDataset();
const run = runPipeline(pipe.raw);
add('dim_customer', DIM_CUSTOMER.map((d) => ({ customer_key: d.customerKey, name: d.name, segment: d.segment, region: d.region })));
add('fact_payment', run.facts.map((f) => ({
  payment_key: f.paymentKey, date_key: f.dateKey, month: f.month, customer_key: f.customerKey, channel: f.channel, currency: f.currency,
  amount_original: f.amountOriginal, fx_rate: f.fxRate, amount_cad: f.amountCad, natural_key: f.naturalKey, lineage_raw_ids: f.lineageRawIds.join(','),
})));
writeFileSync(join(out, 'pipeline_raw.json'), JSON.stringify(pipe.raw, null, 1));

// ---- SQLite seed script ----
const schema = readFileSync(join(root, 'sql', 'schema.sql'), 'utf8');
const inserts = tables.map(({ name, rows }) => {
  const cols = Object.keys(rows[0]);
  return `-- ${name}: ${rows.length} rows\n` + rows.map((r) => `INSERT INTO ${name} (${cols.join(', ')}) VALUES (${cols.map((c) => sqlCell(r[c])).join(', ')});`).join('\n');
});
writeFileSync(join(out, 'seed_sqlite.sql'), `-- Synthetic portfolio data — ALL FICTIONAL. Seeds: AML ${aml.seed}, reconciliation ${rec.seed}, pipeline ${pipe.seed}.\nBEGIN TRANSACTION;\n${schema}\n${inserts.join('\n\n')}\nCOMMIT;\n`);

// ---- Expected engine outputs for the SQL parity check ----
const recon = reconcile(rec.source, rec.target, rec.staging);
writeFileSync(join(out, 'expected', 'reconciliation.json'), JSON.stringify(recon.results.map((r) => ({ src_id: r.sourceId, je_id: r.targetIds[0] ?? null, status: r.status })), null, 1));
const byCust = groupByCustomer(aml.transactions);
const ruleCustomers = (fn: typeof r1HighVelocity) => aml.customers.filter((c) => fn(c, byCust.get(c.customerId) ?? [])).map((c) => c.customerId).sort();
writeFileSync(join(out, 'expected', 'aml_rules.json'), JSON.stringify({
  r1_high_velocity: ruleCustomers(r1HighVelocity), r2_large_vs_profile: ruleCustomers(r2LargeVsProfile), r3_cash_below_threshold: ruleCustomers(r3CashJustBelowThreshold),
  r4_monthly_inflow: ruleCustomers(r4InflowExceedsProfile), r5_duplicates: ruleCustomers(r5DuplicatePosting),
  alerts: runDetection(aml).map((a) => ({ caseId: a.caseId, customerId: a.customerId, rules: a.hits.map((h) => h.ruleId) })),
}, null, 1));
writeFileSync(join(out, 'expected', 'pipeline.json'), JSON.stringify(run.metrics.monthlyByChannel, null, 1));

for (const f of readdirSync(out)) if (f.endsWith('.csv') || f === 'seed_sqlite.sql') copyFileSync(join(out, f), join(root, 'public', 'data', f));

console.log(`Exported ${tables.map((t) => `${t.name}(${t.rows.length})`).join(', ')}`);

// ---- Generated documentation ----
import { DATA_DICTIONARY } from '../src/content/dataDictionary';
import { FEATURE_STATUS } from '../src/content/status';
import { SCENARIOS, AML_SEED } from '../src/data/aml/generate';
import { RULE_CATALOG } from '../src/engine/aml/rules';
mkdirSync(join(root, 'docs'), { recursive: true });
const md = (s: string) => s.replace(/\|/g, '\\|');
writeFileSync(join(root, 'docs', 'DATA_DICTIONARY.md'), [
  '# Data dictionary', '', '> Generated by `npm run seed` from `src/content/dataDictionary.ts`. All data is synthetic.', '',
  ...DATA_DICTIONARY.flatMap((t) => [`## ${t.table}`, '', `*Lab:* ${t.lab} · *Grain:* ${t.grain} · *Seed:* ${t.seed}`, '', '| Column | Type | Description |', '|---|---|---|', ...t.columns.map(([n, ty, d]) => `| \`${md(n)}\` | ${md(ty)} | ${md(d)} |`), '']),
].join('\n'));
writeFileSync(join(root, 'docs', 'FEATURE_STATUS.md'), [
  '# Feature status', '', '> Generated by `npm run seed` from `src/content/status.ts` (also shown on the site at `#/status`).', '',
  '| Area | Feature | Status | Verified by | Notes |', '|---|---|---|---|---|',
  ...FEATURE_STATUS.map((f) => `| ${f.area} | ${md(f.feature)} | **${f.status}** | ${md(f.tested)} | ${md(f.note ?? '')} |`), '',
].join('\n'));
const alertsNow = runDetection(aml);
writeFileSync(join(root, 'docs', 'AML_SCENARIOS.md'), [
  '# AML lab — scenarios and rules', '', `> Generated by \`npm run seed\`. Dataset seed ${AML_SEED}. Fictional data; teaching notes are discussion guidance, not ground truth.`, '',
  '## Rules', '', '| ID | Name | Category | Weight | Logic |', '|---|---|---|---|---|',
  ...RULE_CATALOG.map((r) => `| \`${r.id}\` | ${r.name} | ${r.category} | ${r.weight} | ${md(r.logic)} |`), '',
  '## Scenarios', '',
  ...SCENARIOS.flatMap((s) => {
    const a = alertsNow.find((x) => x.customerId === s.customerId)!;
    return [`### ${s.scenarioId} — ${s.title}`, '', `- Customer: ${s.customerId} · Case: ${a.caseId} · Score: ${a.score} (${a.band})`, `- Rules: ${s.expectedRules.join(', ')}`, `- Pattern: ${s.description}`, `- Suggested proportionate step: ${s.suggestedDisposition}`, `- Teaching note: ${s.reviewerReasoning}`, ''];
  }),
].join('\n'));
console.log('Wrote docs/DATA_DICTIONARY.md, docs/FEATURE_STATUS.md, docs/AML_SCENARIOS.md');
