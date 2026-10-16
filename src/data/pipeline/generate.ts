/**
 * Reproducible raw feeds for the financial data engineering lab.
 * Three sources with different shapes, formats and seeded quality problems.
 */
import { createRng } from '../../lib/prng';
import { addDays } from '../../lib/dates';

export const PIPELINE_SEED = 909;

export type SourceName = 'card_settlement' | 'eft_receipts' | 'erp_ar_receipts';

export interface RawRecord {
  rawId: string;
  source: SourceName;
  ingestedAt: string;
  /** Exactly as delivered — strings, as a CSV loader would see them. */
  payload: Record<string, string>;
}

export interface DimCustomer { customerKey: string; name: string; segment: 'Retail' | 'Small business' | 'Commercial'; region: string }

export const DIM_CUSTOMER: DimCustomer[] = [
  { customerKey: 'C-001', name: 'Granite Bakery Ltd.', segment: 'Small business', region: 'Ottawa' },
  { customerKey: 'C-002', name: 'Silverline Logistics Inc.', segment: 'Commercial', region: 'Toronto' },
  { customerKey: 'C-003', name: 'Harbour Dental Clinic', segment: 'Small business', region: 'Halifax' },
  { customerKey: 'C-004', name: 'Willow Hardware Co.', segment: 'Small business', region: 'Calgary' },
  { customerKey: 'C-005', name: 'Summit Consulting Group', segment: 'Commercial', region: 'Montréal' },
  { customerKey: 'C-006', name: 'Copperleaf Catering', segment: 'Small business', region: 'Ottawa' },
  { customerKey: 'C-007', name: 'Fieldstone Property Mgmt', segment: 'Commercial', region: 'Vancouver' },
  { customerKey: 'C-008', name: 'A. Brightwater', segment: 'Retail', region: 'Ottawa' },
  { customerKey: 'C-009', name: 'R. Holloway', segment: 'Retail', region: 'Kingston' },
  { customerKey: 'C-010', name: 'Tidewater Florist', segment: 'Small business', region: 'Halifax' },
];

/** Card merchant IDs and EFT payer accounts map to customers through these cross-reference tables. */
export const MERCHANT_XREF: Record<string, string> = { 'M-88001': 'C-001', 'M-88002': 'C-003', 'M-88003': 'C-006', 'M-88004': 'C-010', 'M-88005': 'C-004' };
export const PAYER_XREF: Record<string, string> = { '6100234': 'C-002', '6100877': 'C-005', '6101450': 'C-007', '6102291': 'C-008', '6102555': 'C-009' };
export const ERP_XREF: Record<string, string> = { 'CUST-A01': 'C-001', 'CUST-A02': 'C-002', 'CUST-A04': 'C-004', 'CUST-A05': 'C-005', 'CUST-A07': 'C-007' };

export const FX_TO_CAD: Record<string, Record<string, number>> = {
  CAD: { '2026-04': 1, '2026-05': 1, '2026-06': 1 },
  USD: { '2026-04': 1.37, '2026-05': 1.36, '2026-06': 1.38 },
};

export type SeededIssue = 'missing_key' | 'bad_date' | 'non_positive' | 'bad_currency' | 'exact_duplicate' | 'key_duplicate' | 'unknown_customer';

export interface PipelineDataset {
  seed: number;
  raw: RawRecord[];
  seededIssues: Record<string, SeededIssue>;
}

export function generatePipelineDataset(seed: number = PIPELINE_SEED): PipelineDataset {
  const rng = createRng(seed);
  const raw: RawRecord[] = [];
  const seededIssues: Record<string, SeededIssue> = {};
  let rid = 1;
  let ingest = Date.parse('2026-07-01T02:00:00Z');
  const add = (source: SourceName, payload: Record<string, string>, issue?: SeededIssue) => {
    const rawId = `RAW-${String(rid++).padStart(5, '0')}`;
    ingest += 1000;
    raw.push({ rawId, source, ingestedAt: new Date(ingest).toISOString(), payload });
    if (issue) seededIssues[rawId] = issue;
    return rawId;
  };
  const day = () => addDays('2026-04-01', rng.int(0, 90));

  // Card settlement (120 rows): ISO timestamps, decimal amounts.
  const merchants = Object.keys(MERCHANT_XREF);
  for (let i = 0; i < 120; i++) {
    add('card_settlement', {
      settlement_id: `CS-${70000 + i}`, txn_ts: `${day()}T${String(rng.int(8, 21)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00Z`,
      merchant_id: rng.pick(merchants), amount: rng.money(12, 680).toFixed(2), currency: 'CAD', card_brand: rng.pick(['VISA', 'MC', 'AMEX']),
    });
  }
  // EFT receipts (90 rows): amounts in CENTS as strings, some USD.
  const payers = Object.keys(PAYER_XREF);
  for (let i = 0; i < 90; i++) {
    add('eft_receipts', {
      trace_no: `EFT-${510000 + i}`, value_date: day(), payer_account: rng.pick(payers),
      amount_cents: String(Math.round(rng.money(800, 45000) * 100)), currency: rng.chance(0.2) ? 'USD' : 'CAD',
    });
  }
  // ERP AR receipts (80 rows): DD/MM/YYYY dates, customer codes.
  const codes = Object.keys(ERP_XREF);
  for (let i = 0; i < 80; i++) {
    const [y, m, d] = day().split('-');
    add('erp_ar_receipts', { doc_no: `AR-${30100 + i}`, receipt_date: `${d}/${m}/${y}`, customer_code: rng.pick(codes), amount: rng.money(300, 22000).toFixed(2), currency_code: 'CAD' });
  }

  // ---- Seeded quality problems (added as additional deliveries) --------------------------------
  add('card_settlement', { settlement_id: 'CS-70500', txn_ts: '2026-05-11T10:15:00Z', merchant_id: '', amount: '84.20', currency: 'CAD', card_brand: 'VISA' }, 'missing_key');
  add('card_settlement', { settlement_id: 'CS-70501', txn_ts: '2026-06-02T12:00:00Z', merchant_id: '', amount: '19.99', currency: 'CAD', card_brand: 'MC' }, 'missing_key');
  add('eft_receipts', { trace_no: 'EFT-519001', value_date: '2026-05-20', payer_account: '', amount_cents: '1250000', currency: 'CAD' }, 'missing_key');
  add('erp_ar_receipts', { doc_no: 'AR-30900', receipt_date: '', customer_code: 'CUST-A02', amount: '5400.00', currency_code: 'CAD' }, 'missing_key');
  add('erp_ar_receipts', { doc_no: 'AR-30901', receipt_date: '31/04/2026', customer_code: 'CUST-A04', amount: '1200.00', currency_code: 'CAD' }, 'bad_date');
  add('erp_ar_receipts', { doc_no: 'AR-30902', receipt_date: '2026-05-14', customer_code: 'CUST-A01', amount: '880.00', currency_code: 'CAD' }, 'bad_date');
  add('card_settlement', { settlement_id: 'CS-70502', txn_ts: 'not-a-date', merchant_id: 'M-88002', amount: '45.00', currency: 'CAD', card_brand: 'VISA' }, 'bad_date');
  add('eft_receipts', { trace_no: 'EFT-519002', value_date: '2025-12-30', payer_account: '6100877', amount_cents: '990000', currency: 'CAD' }, 'bad_date');
  add('card_settlement', { settlement_id: 'CS-70503', txn_ts: '2026-04-19T09:30:00Z', merchant_id: 'M-88003', amount: '-32.50', currency: 'CAD', card_brand: 'MC' }, 'non_positive');
  add('erp_ar_receipts', { doc_no: 'AR-30903', receipt_date: '12/06/2026', customer_code: 'CUST-A05', amount: '0.00', currency_code: 'CAD' }, 'non_positive');
  add('eft_receipts', { trace_no: 'EFT-519003', value_date: '2026-06-09', payer_account: '6101450', amount_cents: '-450000', currency: 'CAD' }, 'non_positive');
  add('eft_receipts', { trace_no: 'EFT-519004', value_date: '2026-05-05', payer_account: '6100234', amount_cents: '2250000', currency: 'EUR' }, 'bad_currency');
  add('card_settlement', { settlement_id: 'CS-70504', txn_ts: '2026-06-21T15:45:00Z', merchant_id: 'M-88001', amount: '61.00', currency: 'XXX', card_brand: 'VISA' }, 'bad_currency');
  add('erp_ar_receipts', { doc_no: 'AR-30904', receipt_date: '03/05/2026', customer_code: 'CUST-A07', amount: '7300.00', currency_code: 'GBP' }, 'bad_currency');
  add('card_settlement', { settlement_id: 'CS-70505', txn_ts: '2026-05-30T11:00:00Z', merchant_id: 'M-88999', amount: '120.00', currency: 'CAD', card_brand: 'AMEX' }, 'unknown_customer');
  add('eft_receipts', { trace_no: 'EFT-519005', value_date: '2026-04-28', payer_account: '6109999', amount_cents: '310000', currency: 'CAD' }, 'unknown_customer');
  add('erp_ar_receipts', { doc_no: 'AR-30905', receipt_date: '15/06/2026', customer_code: 'CUST-Z99', amount: '2100.00', currency_code: 'CAD' }, 'unknown_customer');

  // Exact re-deliveries of existing rows (file sent twice).
  for (const idx of [3, 17, 45, 130, 150, 220]) {
    const orig = raw[idx];
    add(orig.source, { ...orig.payload }, 'exact_duplicate');
  }
  // Corrected versions of existing documents (same natural key, new amount) — keep the latest.
  for (const idx of [215, 240, 262]) {
    const orig = raw[idx];
    const p = { ...orig.payload };
    p.amount = (Number(p.amount) + 100).toFixed(2);
    add(orig.source, p, 'key_duplicate');
  }
  return { seed, raw, seededIssues };
}
