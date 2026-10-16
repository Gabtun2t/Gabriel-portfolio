/**
 * Reproducible synthetic reconciliation dataset.
 *
 * Source: the fictional lender's LEGACY core extract for May 2026 (one row per customer posting).
 * Target: the same postings after migration into the new ERP general ledger (batch MIG-0612).
 *
 * Seeded exceptions (counts are asserted by tests):
 *   clean ............................. 150   (identical)
 *   date within tolerance (1–2 days) ..   4   (matched, with a variance note)
 *   missing in target .................   5   (rejected at load)
 *   duplicated in target ..............   4   (load run 2 re-inserted rows)
 *   corrupted reference ...............   4   (encoding, formatting, truncation, transposition)
 *   wrong GL mapping ..................   3   (segment SB mapped to retail deposits)
 *   amount difference .................   3   (decimal ×100, digit transposition, rounding)
 *   date difference beyond tolerance ..   3   (day/month swapped)
 *   ERP entries with no source ........   2   (manual journals)
 */
import { createRng } from '../../lib/prng';
import { addDays, swapMonthDay } from '../../lib/dates';

export const RECON_SEED = 612;
export const EXTRACT_FILE = 'legacy_core_extract_2026-05.csv';

export type Segment = 'RT' | 'SB' | 'CM';

export interface SourceRow {
  srcId: string;
  extractRow: number;
  postingDate: string;
  customerId: string;
  segment: Segment;
  reference: string;
  amount: number;
  description: string;
}

export interface TargetEntry {
  jeId: string;
  postingDate: string;
  glAccount: string;
  reference: string;
  amount: number;
  customerId: string | null;
  migrationBatch: string | null;
  loadRun: number | null;
  stagingRowId: string | null;
  entryType: 'MIGRATED' | 'MANUAL_JOURNAL' | 'CORRECTION';
  status: 'POSTED' | 'REVERSED';
  description: string;
}

export interface StagingRow {
  stagingRowId: string;
  srcId: string;
  extractRow: number;
  mappingVersion: string;
  loadStatus: 'LOADED' | 'REJECTED';
  rejectReason: string | null;
  loadRuns: number[];
}

export interface GlMapping {
  segment: Segment;
  glAccount: string;
  glName: string;
}

export const GL_MAPPING: GlMapping[] = [
  { segment: 'RT', glAccount: '2110', glName: 'Customer deposits – retail' },
  { segment: 'SB', glAccount: '2100', glName: 'Customer deposits – business' },
  { segment: 'CM', glAccount: '2100', glName: 'Customer deposits – business' },
];

export const GL_NAMES: Record<string, string> = {
  '2100': 'Customer deposits – business',
  '2110': 'Customer deposits – retail',
};

export type SeededCase =
  | 'clean' | 'date_tolerance' | 'missing' | 'duplicate' | 'ref_encoding' | 'ref_format' | 'ref_truncated' | 'ref_transposed'
  | 'wrong_mapping' | 'amount_decimal' | 'amount_transposed' | 'amount_rounding' | 'date_swapped';

export interface ReconDataset {
  seed: number;
  source: SourceRow[];
  target: TargetEntry[];
  staging: StagingRow[];
  /** What was seeded for each source row — used by tests only, never by the matcher. */
  seededCase: Record<string, SeededCase>;
}

const CUSTOMERS: { id: string; seg: Segment }[] = [
  { id: 'CUS-1002', seg: 'SB' }, { id: 'CUS-1005', seg: 'CM' }, { id: 'CUS-1008', seg: 'SB' }, { id: 'CUS-1011', seg: 'RT' },
  { id: 'CUS-1014', seg: 'CM' }, { id: 'CUS-1018', seg: 'SB' }, { id: 'CUS-1021', seg: 'RT' }, { id: 'CUS-1024', seg: 'CM' },
  { id: 'CUS-1026', seg: 'SB' }, { id: 'CUS-1029', seg: 'RT' }, { id: 'CUS-1031', seg: 'CM' }, { id: 'CUS-1035', seg: 'SB' },
];

export function generateReconDataset(seed: number = RECON_SEED): ReconDataset {
  const rng = createRng(seed);
  const source: SourceRow[] = [];
  const seededCase: Record<string, SeededCase> = {};
  let refN = 45100;

  const plan: SeededCase[] = [
    ...Array<SeededCase>(150).fill('clean'),
    ...Array<SeededCase>(4).fill('date_tolerance'),
    ...Array<SeededCase>(5).fill('missing'),
    ...Array<SeededCase>(1).fill('duplicate'), // + 3 fixed Maple Ridge duplicates below
    'ref_encoding', 'ref_format', 'ref_truncated', 'ref_transposed',
    ...Array<SeededCase>(3).fill('wrong_mapping'),
    'amount_transposed', 'amount_rounding', // + fixed decimal-shift row below
    ...Array<SeededCase>(3).fill('date_swapped'),
  ];
  // Deterministic shuffle so exceptions are scattered through the file.
  for (let i = plan.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [plan[i], plan[j]] = [plan[j], plan[i]];
  }

  const fixed: { case: SeededCase; customerId: string; seg: Segment; ref: string; date: string; amount: number; desc: string }[] = [
    { case: 'duplicate', customerId: 'CUS-1024', seg: 'CM', ref: 'RCPT-48807', date: '2026-05-14', amount: 18420.0, desc: 'Receipt – Quarrystone Homes Construction' },
    { case: 'duplicate', customerId: 'CUS-1024', seg: 'CM', ref: 'RCPT-48812', date: '2026-05-15', amount: 7965.5, desc: 'Receipt – Kestrelmoor Renovations' },
    { case: 'duplicate', customerId: 'CUS-1024', seg: 'CM', ref: 'RCPT-48830', date: '2026-05-19', amount: 23110.75, desc: 'Receipt – Elmhaven Developments' },
    { case: 'amount_decimal', customerId: 'CUS-1031', seg: 'CM', ref: 'RCPT-55821', date: '2026-05-27', amount: 12450.0, desc: 'Receipt – Quillmere Grain Co-operative' },
  ];

  let row = 1;
  for (const c of plan) {
    let cust = rng.pick(CUSTOMERS);
    if (c === 'wrong_mapping') cust = rng.pick(CUSTOMERS.filter((x) => x.seg === 'SB'));
    // A day-month swap only produces a different valid date when the day is ≤ 12 and not 5 (May).
    const day = c === 'date_swapped' ? rng.pick([1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12]) : rng.int(1, 31);
    const date = `2026-05-${String(day).padStart(2, '0')}`;
    let amount = rng.money(250, cust.seg === 'CM' ? 40000 : cust.seg === 'SB' ? 9000 : 2500);
    if (c === 'amount_transposed') amount = 4518.0;
    if (c === 'amount_rounding') amount = 2310.47;
    source.push({
      srcId: `LEG-${String(row).padStart(6, '0')}`, extractRow: row, postingDate: date, customerId: cust.id, segment: cust.seg,
      reference: `RCPT-${refN++}`, amount, description: rng.pick(['Customer receipt', 'Supplier payment return', 'Deposit', 'Transfer in']),
    });
    seededCase[`LEG-${String(row).padStart(6, '0')}`] = c;
    row++;
  }
  for (const f of fixed) {
    source.push({ srcId: `LEG-${String(row).padStart(6, '0')}`, extractRow: row, postingDate: f.date, customerId: f.customerId, segment: f.seg, reference: f.ref, amount: f.amount, description: f.desc });
    seededCase[`LEG-${String(row).padStart(6, '0')}`] = f.case;
    row++;
  }

  // ---- Build staging log and target ledger -------------------------------------------------
  const target: TargetEntry[] = [];
  const staging: StagingRow[] = [];
  let je = 1;
  const nextJe = () => `JE-26-${String(je++).padStart(5, '0')}`;
  const glFor = (seg: Segment) => GL_MAPPING.find((m) => m.segment === seg)!.glAccount;

  for (const s of source) {
    const c = seededCase[s.srcId];
    const stg: StagingRow = {
      stagingRowId: `STG-${String(s.extractRow).padStart(6, '0')}`, srcId: s.srcId, extractRow: s.extractRow,
      mappingVersion: 'v1.3', loadStatus: 'LOADED', rejectReason: null, loadRuns: [1],
    };
    staging.push(stg);
    if (c === 'missing') {
      stg.loadStatus = 'REJECTED';
      stg.loadRuns = [];
      stg.rejectReason = rng.pick(['posting_period lookup returned NULL (period not opened in ERP at load time)', 'customer_id not found in ERP customer master at load time']);
      continue;
    }
    const base: TargetEntry = {
      jeId: nextJe(), postingDate: s.postingDate, glAccount: glFor(s.segment), reference: s.reference, amount: s.amount,
      customerId: s.customerId, migrationBatch: 'MIG-0612', loadRun: 1, stagingRowId: stg.stagingRowId, entryType: 'MIGRATED', status: 'POSTED',
      description: s.description,
    };
    switch (c) {
      case 'date_tolerance': base.postingDate = addDays(s.postingDate, rng.int(1, 2)); break;
      case 'ref_encoding': base.reference = s.reference.slice(0, 8) + '�' + s.reference.slice(8); break;
      case 'ref_format': base.reference = ` ${s.reference.toLowerCase().replace('-', ' ')} `; break;
      case 'ref_truncated': base.reference = s.reference.slice(0, 7); break;
      case 'ref_transposed': {
        const r = s.reference;
        // swap two adjacent digits that differ
        let i = 6;
        while (i < r.length - 1 && r[i] === r[i + 1]) i++;
        base.reference = r.slice(0, i) + r[i + 1] + r[i] + r.slice(i + 2);
        break;
      }
      case 'wrong_mapping': base.glAccount = '2110'; stg.mappingVersion = 'v1.2'; break;
      case 'amount_decimal': base.amount = Math.round(s.amount * 100 * 100) / 100; break;
      case 'amount_transposed': base.amount = 4158.0; break;
      case 'amount_rounding': base.amount = 2310.5; break;
      case 'date_swapped': base.postingDate = swapMonthDay(s.postingDate)!; break;
    }
    target.push(base);
    if (c === 'duplicate') {
      stg.loadRuns = [1, 2];
      target.push({ ...base, jeId: nextJe(), loadRun: 2 });
    }
  }

  target.push(
    { jeId: 'MJ-0007', postingDate: '2026-05-31', glAccount: '2100', reference: 'MJ-0007', amount: 3200.0, customerId: null, migrationBatch: null, loadRun: null, stagingRowId: null, entryType: 'MANUAL_JOURNAL', status: 'POSTED', description: 'Suspense clearing – migration (manual)' },
    { jeId: 'MJ-0009', postingDate: '2026-05-31', glAccount: '2100', reference: 'MJ-0009', amount: 15750.0, customerId: null, migrationBatch: null, loadRun: null, stagingRowId: null, entryType: 'MANUAL_JOURNAL', status: 'POSTED', description: 'Opening balance adjustment (manual)' },
  );

  return { seed, source, target, staging, seededCase };
}
