/**
 * Reproducible synthetic AML dataset.
 *
 * - A baseline population of fictional customers whose activity stays inside their declared
 *   profile (no rule should fire for them — this is asserted by tests).
 * - Eight documented scenarios injected on top of the baseline (see SCENARIOS below and
 *   docs/AML_SCENARIOS.md). Each scenario is designed to trigger specific rules.
 *
 * The fictional institution is "Harbourline Community Finance". In June 2026 it migrated its
 * April–May transaction history from a legacy core system into a new ERP-based ledger
 * (batches MIG-0611 and MIG-0612). Transaction monitoring reads from that ledger, so migration
 * defects can surface as alerts. June activity comes from the live core feed.
 */
import { createRng, type Rng } from '../../lib/prng';
import { addDays } from '../../lib/dates';
import type { AmlDataset, Customer, CustomerDocument, Transaction, Channel, MigrationBatch } from './types';

export const AML_SEED = 20260630;
export const PERIOD_START = '2026-04-01';
export const PERIOD_END = '2026-06-30';
export const AS_OF = '2026-07-20';

const MONTHS = [
  { start: '2026-04-01', days: 30, batch: 'MIG-0611' as string | null },
  { start: '2026-05-01', days: 31, batch: 'MIG-0612' as string | null },
  { start: '2026-06-01', days: 30, batch: null as string | null },
];

const FIRST = ['Avery', 'Jordan', 'Riley', 'Casey', 'Morgan', 'Quinn', 'Taylor', 'Rowan', 'Emerson', 'Hayden', 'Parker', 'Reese', 'Sasha', 'Logan', 'Blake', 'Drew'];
const LAST = ['Ashdown', 'Brightwater', 'Calloway', 'Dunmore', 'Ellery', 'Fairbank', 'Greystone', 'Holloway', 'Ingram', 'Kestler', 'Larkfield', 'Merriman', 'Northcott', 'Oakridge', 'Penhallow', 'Rainford'];
const BIZ_A = ['Granite', 'Silverline', 'Harbour', 'Willow', 'Summit', 'Copperleaf', 'Fieldstone', 'Riverbend', 'Lantern', 'Tidewater', 'Birchwood', 'Ironwood'];
const BIZ_B = ['Bakery', 'Auto Repair', 'Dental Clinic', 'Consulting', 'Hardware', 'Catering', 'Logistics', 'Florist', 'Plumbing', 'Bookkeeping', 'Fitness Studio', 'Printing'];
const COUNTERPARTIES = ['Metro Utilities Co-op', 'Northline Telecom', 'Brookfield Grocers', 'Valley Insurance Mutual', 'Cityline Transit', 'Parkside Property Mgmt', 'Westgate Office Supply', 'Clearwater Payroll Services', 'Hilltop Fuel & Energy', 'Rideau Wholesale Foods', 'Maplecrest Equipment Rental', 'Union Street Pharmacy'];

const CHANNEL_PREFIX: Record<Channel, string> = {
  eft: 'EFT', wire_domestic: 'WIR', wire_international: 'WIX', cash: 'CSH', card: 'CRD', internal: 'INT',
};

export interface ScenarioDefinition {
  scenarioId: string;
  customerId: string;
  title: string;
  category: string;
  description: string;
  expectedRules: string[];
  /** Teaching guidance shown after the visitor records a disposition. Not a ground truth. */
  reviewerReasoning: string;
  suggestedDisposition: 'FURTHER_INVESTIGATION' | 'REQUEST_INFORMATION' | 'ESCALATE_TO_COMPLIANCE' | 'CLOSE_EXPLAINED_EXCEPTION';
}

export const SCENARIOS: ScenarioDefinition[] = [
  {
    scenarioId: 'S1', customerId: 'CUS-1007', title: 'Transaction frequency anomaly', category: 'Velocity',
    description: 'A small printing business with ~12 transactions a month receives 16 incoming EFTs from 14 different payers in six days.',
    expectedRules: ['R1_HIGH_VELOCITY'],
    reviewerReasoning: 'The burst is far above the declared pattern, but the individual amounts are modest and consistent with customer payments. Nothing on file explains it, and KYC is overdue for refresh. A proportionate next step is a request for information (e.g. invoices or a description of the job driving the payments) combined with the KYC refresh — not immediate escalation, and not closure without support.',
    suggestedDisposition: 'REQUEST_INFORMATION',
  },
  {
    scenarioId: 'S2', customerId: 'CUS-1012', title: 'Unusual amount vs. profile', category: 'Amount',
    description: 'A salaried retail customer with ~$6.5k monthly credits receives a single $48,500 domestic wire from a title/escrow company.',
    expectedRules: ['R2_LARGE_VS_PROFILE', 'R4_INFLOW_EXCEEDS_PROFILE'],
    reviewerReasoning: 'A one-off large credit from an escrow-type counterparty is consistent with a property sale, and a KYC note mentions a planned sale — but nothing is documented. The note makes the explanation plausible, not proven. Requesting the closing statement is the evidence-led step before deciding.',
    suggestedDisposition: 'REQUEST_INFORMATION',
  },
  {
    scenarioId: 'S3', customerId: 'CUS-1019', title: 'Customer profile inconsistency', category: 'Profile',
    description: 'A student account declared for payroll deposits receives four international wires from four unrelated companies, each moved out within ~1 day.',
    expectedRules: ['R2_LARGE_VS_PROFILE', 'R4_INFLOW_EXCEEDS_PROFILE', 'R6_RAPID_PASS_THROUGH', 'R7_PROFILE_INCONSISTENCY'],
    reviewerReasoning: 'Three independent indicators align: activity type inconsistent with the declared purpose, volume far above profile, and funds passing straight through. There is no documented explanation and the counterparties have no apparent link to the customer. This warrants escalation to compliance for their assessment; the simulation does not — and cannot — conclude that an offence occurred.',
    suggestedDisposition: 'ESCALATE_TO_COMPLIANCE',
  },
  {
    scenarioId: 'S4', customerId: 'CUS-1024', title: 'Duplicate source / ERP entries', category: 'Data quality',
    description: 'Three supplier receipts appear twice in May. Each pair has identical reference, amount and date but different migration load runs.',
    expectedRules: ['R5_DUPLICATE_POSTING'],
    reviewerReasoning: 'The duplicates differ only by load run (1 vs 2) in batch MIG-0612, a known defect (re-run without idempotent load) is logged, and the reconciliation report confirms the extra rows. Removing them, no rule fires. Closing as an explained data exception is supported — with a data-correction request so the ledger is fixed at source.',
    suggestedDisposition: 'CLOSE_EXPLAINED_EXCEPTION',
  },
  {
    scenarioId: 'S5', customerId: 'CUS-1031', title: 'Suspicious-looking migration defect', category: 'Data quality',
    description: 'A $1,245,000.00 receipt for a farm-supply company — ~7× its declared monthly turnover in one transaction. The source ERP shows $12,450.00 for the same reference.',
    expectedRules: ['R2_LARGE_VS_PROFILE', 'R4_INFLOW_EXCEEDS_PROFILE'],
    reviewerReasoning: 'The migrated amount is exactly 100× the source document, the row comes from batch MIG-0612 with a logged amount-scale defect, and reconciliation confirms the mismatch. Re-evaluating with the source amount, no rule fires. Closing as an explained data exception is supported for THIS transaction; the defect does not explain any other activity, which should still be judged on its own evidence.',
    suggestedDisposition: 'CLOSE_EXPLAINED_EXCEPTION',
  },
  {
    scenarioId: 'S6', customerId: 'CUS-1015', title: 'Unresolved exception requiring escalation', category: 'Cash',
    description: 'Four cash deposits between $9,400 and $9,900 at three branches in five days, followed by a $37,000 wire out. The customer has not answered a request for information.',
    expectedRules: ['R2_LARGE_VS_PROFILE', 'R3_CASH_JUST_BELOW_THRESHOLD', 'R4_INFLOW_EXCEEDS_PROFILE'],
    reviewerReasoning: 'Repeated cash just under $10,000 across branches, inflow far above profile, rapid outbound wire, and no response to the RFI after four weeks. No data-quality explanation exists (all rows are live core transactions). The exception remains unresolved, so escalation to compliance is the appropriate outcome. Any reporting decision belongs to the compliance function, not to this tool.',
    suggestedDisposition: 'ESCALATE_TO_COMPLIANCE',
  },
  {
    scenarioId: 'S7', customerId: 'CUS-1027', title: 'Rapid pass-through of funds', category: 'Movement',
    description: 'An import/export company receives $85,000 and sends $79,500 out in two wires within 30 hours, one to a new counterparty.',
    expectedRules: ['R6_RAPID_PASS_THROUGH'],
    reviewerReasoning: 'Paying suppliers and freight forwarders soon after receiving customer funds can be normal for a trading company, and international payments are part of the declared profile. But one recipient is new and the speed is notable. Further investigation (counterparty research, invoices, past pattern) is proportionate before any decision.',
    suggestedDisposition: 'FURTHER_INVESTIGATION',
  },
  {
    scenarioId: 'S8', customerId: 'CUS-1003', title: 'Documented seasonal spike', category: 'Profile',
    description: 'A landscaping company’s May inflows are more than 3× its declared monthly average. Seasonality is documented in the KYC file.',
    expectedRules: ['R4_INFLOW_EXCEEDS_PROFILE'],
    reviewerReasoning: 'The only indicator is volume, the counterparties look like residential and property-management clients, and the KYC file documents April–June seasonality with prior-year statements. Closing as an explained exception is supported, and the customer profile could be updated to reflect seasonality so the alert does not recur.',
    suggestedDisposition: 'CLOSE_EXPLAINED_EXCEPTION',
  },
];

interface ProfileSeed {
  customerId: string;
  name?: string;
  type: Customer['type'];
  segment: Customer['segment'];
  activity: string;
  accountPurpose: string;
  turnover: number;
  expected: number;
  opened: string;
  kycLastReview: string;
  kycStatus?: Customer['kycStatus'];
  internationalExpected?: boolean;
  cashIntensive?: boolean;
  documents?: CustomerDocument[];
  scenarioId?: string;
}

const SCENARIO_PROFILES: ProfileSeed[] = [
  {
    customerId: 'CUS-1003', name: 'Pinecrest Seasonal Landscaping Ltd.', type: 'business', segment: 'small_business', scenarioId: 'S8',
    activity: 'Landscaping and grounds maintenance', accountPurpose: 'Business operating account – customer receipts and supplier payments',
    turnover: 30000, expected: 20, opened: '2019-03-14', kycLastReview: '2025-11-04',
    documents: [{ docId: 'DOC-3001', date: '2025-11-04', type: 'kyc_note', summary: 'Periodic review: business is seasonal. April–June revenue is typically 3–4× the declared monthly average; 2024 and 2025 bank statements on file confirm the pattern.', explainsRules: ['R4_INFLOW_EXCEEDS_PROFILE'] }],
  },
  {
    customerId: 'CUS-1007', name: 'Kestrel Print & Signage Ltd.', type: 'business', segment: 'small_business', scenarioId: 'S1',
    activity: 'Commercial printing and signage', accountPurpose: 'Business operating account – customer receipts and supplier payments',
    turnover: 24000, expected: 12, opened: '2021-08-02', kycLastReview: '2025-03-02', kycStatus: 'refresh_due',
    documents: [{ docId: 'DOC-3002', date: '2025-03-02', type: 'kyc_note', summary: 'Onboarding refresh: owner-operated print shop, ~10–15 customer payments per month, mostly local businesses. Next review due March 2026.', explainsRules: [] }],
  },
  {
    customerId: 'CUS-1012', name: 'Dana Whitlock', type: 'individual', segment: 'retail', scenarioId: 'S2',
    activity: 'Salaried employee – healthcare administration', accountPurpose: 'Personal chequing – payroll and bill payments',
    turnover: 6500, expected: 25, opened: '2016-05-20', kycLastReview: '2026-02-10',
    documents: [{ docId: 'DOC-3003', date: '2026-02-10', type: 'kyc_note', summary: 'Branch visit: customer mentioned she plans to sell a property later in 2026. No documents provided.', explainsRules: [] }],
  },
  {
    customerId: 'CUS-1015', name: 'Marcus Lindqvist', type: 'individual', segment: 'retail', scenarioId: 'S6',
    activity: 'Self-employed – renovation contractor (sole proprietor)', accountPurpose: 'Personal chequing',
    turnover: 7000, expected: 20, opened: '2022-01-11', kycLastReview: '2025-12-01',
    documents: [
      { docId: 'DOC-3004', date: '2026-06-16', type: 'rfi_sent', summary: 'Request for information sent: source of four cash deposits (Jun 8–12) and purpose of the $37,000 wire on Jun 13. Response requested within 14 days.', explainsRules: [] },
      { docId: 'DOC-3005', date: '2026-07-14', type: 'kyc_note', summary: 'Follow-up: no response received after 28 days. Second reminder sent; customer did not return branch call.', explainsRules: [] },
    ],
  },
  {
    customerId: 'CUS-1019', name: 'Jordan Pelletier', type: 'individual', segment: 'retail', scenarioId: 'S3',
    activity: 'Student – part-time retail employment', accountPurpose: 'Personal chequing – payroll deposits',
    turnover: 2400, expected: 18, opened: '2025-09-03', kycLastReview: '2025-09-03',
    documents: [],
  },
  {
    customerId: 'CUS-1024', name: 'Maple Ridge Distribution Ltd.', type: 'business', segment: 'commercial', scenarioId: 'S4',
    activity: 'Wholesale distribution – building materials', accountPurpose: 'Business operating account – receivables and payables',
    turnover: 210000, expected: 40, opened: '2014-10-07', kycLastReview: '2026-01-15',
    documents: [
      { docId: 'DOC-3006', date: '2026-06-19', type: 'recon_report', summary: 'Reconciliation REC-2026-0612 (legacy extract vs migrated ledger, May 2026): load run 2 of batch MIG-0612 re-inserted rows already loaded in run 1, including RCPT-48807, RCPT-48812 and RCPT-48830 for this customer.', explainsRules: ['R5_DUPLICATE_POSTING'] },
      { docId: 'DOC-3007', date: '2026-06-13', type: 'defect_log', summary: 'Defect DEF-032: batch MIG-0612 re-run after a timeout without an idempotent load key; some rows inserted twice.', explainsRules: ['R5_DUPLICATE_POSTING'] },
    ],
  },
  {
    customerId: 'CUS-1027', name: 'Bluewater Trading Co.', type: 'business', segment: 'commercial', scenarioId: 'S7',
    activity: 'Wholesale import/export – consumer goods', accountPurpose: 'Business operating account – including international supplier payments',
    turnover: 140000, expected: 30, opened: '2018-06-25', kycLastReview: '2025-10-20', internationalExpected: true,
    documents: [{ docId: 'DOC-3008', date: '2025-10-20', type: 'kyc_note', summary: 'Periodic review: imports goods from overseas suppliers and pays freight forwarders; typical supplier payments $10k–$60k.', explainsRules: [] }],
  },
  {
    customerId: 'CUS-1031', name: 'Northgate Agri Supplies Inc.', type: 'business', segment: 'commercial', scenarioId: 'S5',
    activity: 'Agricultural supplies – retail and wholesale', accountPurpose: 'Business operating account – receivables and payables',
    turnover: 180000, expected: 30, opened: '2012-04-18', kycLastReview: '2025-12-09',
    documents: [
      { docId: 'DOC-3009', date: '2026-06-19', type: 'recon_report', summary: 'Reconciliation REC-2026-0612: RCPT-55821 is $12,450.00 in the legacy extract and source ERP document, but $1,245,000.00 in the migrated ledger (exactly ×100).', explainsRules: ['R2_LARGE_VS_PROFILE', 'R4_INFLOW_EXCEEDS_PROFILE'] },
      { docId: 'DOC-3010', date: '2026-06-13', type: 'defect_log', summary: 'Defect DEF-031: amount field scale mapping in batch MIG-0612 — some rows loaded with implied-decimal amounts not divided by 100.', explainsRules: [] },
    ],
  },
];

function deriveRisk(p: ProfileSeed, asOf: string): { factors: string[]; rating: Customer['riskRating'] } {
  // Explainable, product/channel-based factors only. No name, age, nationality, gender or other demographic proxies.
  const factors: string[] = [];
  if (p.cashIntensive) factors.push('Cash-intensive activity declared');
  if (p.internationalExpected) factors.push('International payments in declared purpose');
  if (p.segment === 'commercial') factors.push('Commercial segment (higher transaction values)');
  const ageDays = (new Date(asOf).getTime() - new Date(p.opened).getTime()) / 86_400_000;
  if (ageDays < 365) factors.push('Account open less than 12 months');
  const rating = factors.length >= 2 ? 'high' : factors.length === 1 ? 'medium' : 'low';
  return { factors, rating };
}

function kycStatusFor(p: ProfileSeed, asOf: string): Customer['kycStatus'] {
  if (p.kycStatus) return p.kycStatus;
  const age = (new Date(asOf).getTime() - new Date(p.kycLastReview).getTime()) / 86_400_000;
  return age > 365 ? 'refresh_due' : 'verified';
}

function baselineProfiles(rng: Rng): ProfileSeed[] {
  const out: ProfileSeed[] = [];
  const taken = new Set(SCENARIO_PROFILES.map((p) => p.customerId));
  let fi = 0;
  for (let n = 1001; n <= 1040; n++) {
    const id = `CUS-${n}`;
    if (taken.has(id)) continue;
    const isBiz = rng.chance(0.45);
    const opened = `20${rng.int(12, 24)}-${String(rng.int(1, 12)).padStart(2, '0')}-${String(rng.int(1, 28)).padStart(2, '0')}`;
    const reviewMonth = rng.int(1, 12);
    const kycLastReview = `${rng.chance(0.85) ? 2026 : 2025}-${String(Math.min(reviewMonth, 6)).padStart(2, '0')}-${String(rng.int(1, 28)).padStart(2, '0')}`;
    if (isBiz) {
      const commercial = rng.chance(0.35);
      const kind = BIZ_B[fi % BIZ_B.length];
      out.push({
        customerId: id,
        name: `${BIZ_A[fi % BIZ_A.length]} ${kind} ${rng.pick(['Ltd.', 'Inc.', 'Co.'])}`,
        type: 'business', segment: commercial ? 'commercial' : 'small_business',
        activity: kind, accountPurpose: 'Business operating account – customer receipts and supplier payments',
        turnover: commercial ? rng.int(80, 260) * 1000 : rng.int(12, 60) * 1000,
        expected: commercial ? rng.int(25, 45) : rng.int(10, 25),
        opened, kycLastReview,
        internationalExpected: commercial && rng.chance(0.4),
        cashIntensive: !commercial && ['Bakery', 'Catering', 'Florist', 'Auto Repair'].includes(kind),
      });
    } else {
      out.push({
        customerId: id,
        name: `${FIRST[fi % FIRST.length]} ${LAST[(fi * 7) % LAST.length]}`,
        type: 'individual', segment: 'retail',
        activity: rng.pick(['Salaried employee', 'Public-sector employee', 'Retired – pension income', 'Self-employed consultant', 'Hourly employee']),
        accountPurpose: 'Personal chequing – payroll and bill payments',
        turnover: rng.int(25, 110) * 100,
        expected: rng.int(12, 35),
        opened, kycLastReview,
      });
    }
    fi++;
  }
  return out;
}

export function generateAmlDataset(seed: number = AML_SEED): AmlDataset {
  const rng = createRng(seed);
  const profiles = [...SCENARIO_PROFILES, ...baselineProfiles(rng)].sort((a, b) => a.customerId.localeCompare(b.customerId));

  const customers: Customer[] = profiles.map((p) => {
    const risk = deriveRisk(p, AS_OF);
    return {
      customerId: p.customerId,
      name: p.name ?? p.customerId,
      type: p.type,
      segment: p.segment,
      activity: p.activity,
      accountPurpose: p.accountPurpose,
      declaredMonthlyTurnover: p.turnover,
      expectedMonthlyTxCount: p.expected,
      accountOpened: p.opened,
      kycStatus: kycStatusFor(p, AS_OF),
      kycLastReview: p.kycLastReview,
      riskFactors: risk.factors,
      riskRating: risk.rating,
      accountId: `ACC-${p.customerId.slice(4)}-${p.type === 'business' ? 'B' : 'P'}`,
      internationalExpected: !!p.internationalExpected,
      documents: p.documents ?? [],
      scenarioId: p.scenarioId ?? null,
    };
  });

  const txs: Transaction[] = [];
  let refCounter = 40000;
  const nextRef = (channel: Channel, business: boolean, direction: 'credit' | 'debit') =>
    `${business && direction === 'credit' && channel === 'eft' ? 'RCPT' : CHANNEL_PREFIX[channel]}-${refCounter++}`;

  const push = (c: Customer, t: Omit<Transaction, 'txId' | 'customerId' | 'accountId' | 'sourceSystem' | 'migrationBatch' | 'loadRun'> & Partial<Pick<Transaction, 'sourceSystem' | 'migrationBatch' | 'loadRun'>>) => {
    const month = MONTHS.find((m) => t.date >= m.start && t.date < addDays(m.start, m.days))!;
    txs.push({
      txId: '',
      customerId: c.customerId,
      accountId: c.accountId,
      sourceSystem: t.sourceSystem ?? (month.batch ? 'MIGRATED_LEDGER' : 'CORE_LIVE'),
      migrationBatch: t.migrationBatch !== undefined ? t.migrationBatch : month.batch,
      loadRun: t.loadRun !== undefined ? t.loadRun : month.batch ? 1 : null,
      ...t,
    });
  };

  // ---- Baseline activity (inside declared profile) ----
  for (const c of customers) {
    const profile = profiles.find((p) => p.customerId === c.customerId)!;
    const business = c.type === 'business';
    for (const m of MONTHS) {
      const n = Math.max(4, Math.round(c.expectedMonthlyTxCount * (0.75 + rng.next() * 0.3)));
      const credits = Math.max(2, Math.round(n * 0.45));
      const typicalCredit = c.declaredMonthlyTurnover / credits;
      for (let i = 0; i < n; i++) {
        const date = addDays(m.start, rng.int(0, m.days - 1));
        const isCredit = i < credits;
        let channel: Channel;
        let amount: number;
        if (isCredit) {
          if (!business) channel = i === 0 ? 'eft' : rng.pick(['eft', 'internal'] as const);
          else channel = profile.cashIntensive && rng.chance(0.3) ? 'cash' : c.internationalExpected && rng.chance(0.15) ? 'wire_international' : 'eft';
          amount = rng.money(typicalCredit * 0.6, typicalCredit * 1.3);
          if (channel === 'cash') amount = Math.min(amount, rng.money(800, 4000));
        } else {
          channel = business
            ? rng.chance(0.12) ? (c.internationalExpected ? 'wire_international' : 'wire_domestic') : 'eft'
            : rng.pick(['card', 'card', 'eft', 'internal'] as const);
          const cap = channel.startsWith('wire') ? 0.25 : 0.4;
          amount = rng.money(typicalCredit * 0.05, typicalCredit * cap);
        }
        push(c, {
          date, amount, direction: isCredit ? 'credit' : 'debit', channel,
          counterparty: isCredit && !business && channel === 'eft' ? 'Employer payroll deposit' : rng.pick(COUNTERPARTIES),
          counterpartyCountry: channel === 'wire_international' ? rng.pick(['US', 'GB', 'DE', 'JP', 'MX']) : 'CA',
          reference: nextRef(channel, business, isCredit ? 'credit' : 'debit'),
          branch: channel === 'cash' ? rng.pick(['BR-014 Centretown', 'BR-022 Westboro', 'BR-031 Orléans']) : null,
        });
      }
    }
  }

  // ---- Scenario injections ----
  const cust = (id: string) => customers.find((c) => c.customerId === id)!;

  // S1 – frequency burst
  const payers = ['Orrin Event Rentals', 'Halcyon Dental Office', 'Pemberline Sports Club', 'Wrenfield Café Group', 'Corvale Realty', 'Tamberly Brewing', 'Northwick Youth Soccer', 'Ashgrove Vet Clinic', 'Kellan Hall Society', 'Brightvale Physio', 'Merrowind Bakery', 'Dunmerle Hardware', 'Quenby Community Assoc.', 'Ravelstone Fair Committee'];
  for (let i = 0; i < 16; i++) {
    push(cust('CUS-1007'), {
      date: addDays('2026-05-11', Math.floor(i / 3)), amount: rng.money(650, 2300), direction: 'credit', channel: 'eft',
      counterparty: payers[i % payers.length], counterpartyCountry: 'CA', reference: `RCPT-${refCounter++}`, branch: null,
    });
  }

  // S2 – single large credit
  push(cust('CUS-1012'), { date: '2026-05-21', amount: 48500, direction: 'credit', channel: 'wire_domestic', counterparty: 'Brindlewood Title & Escrow', counterpartyCountry: 'CA', reference: 'WIR-61204', branch: null });
  push(cust('CUS-1012'), { date: '2026-05-26', amount: 45000, direction: 'debit', channel: 'internal', counterparty: 'Own savings account', counterpartyCountry: 'CA', reference: 'INT-61377', branch: null });

  // S3 – profile inconsistency with pass-through
  const s3 = [
    { in: '2026-06-03', amt: 11200, from: 'Veltrano Commodities FZE', cc: 'AE', to: 'Ridgeline Electronics Resale' },
    { in: '2026-06-09', amt: 8650, from: 'Skarvik Logistics AS', cc: 'NO', to: 'Coinvale Kiosk Services' },
    { in: '2026-06-16', amt: 12100, from: 'Calderine Bay Holdings Ltd', cc: 'BS', to: 'Ridgeline Electronics Resale' },
    { in: '2026-06-22', amt: 9780, from: 'Virlo Media OÜ', cc: 'EE', to: 'Morrow & Vance Car Sales' },
  ];
  for (const s of s3) {
    push(cust('CUS-1019'), { date: s.in, amount: s.amt, direction: 'credit', channel: 'wire_international', counterparty: s.from, counterpartyCountry: s.cc, reference: `WIX-${refCounter++}`, branch: null });
    push(cust('CUS-1019'), { date: addDays(s.in, 1), amount: Math.round(s.amt * 0.95 * 100) / 100, direction: 'debit', channel: 'wire_domestic', counterparty: s.to, counterpartyCountry: 'CA', reference: `WIR-${refCounter++}`, branch: null });
  }

  // S4 – duplicate migrated receipts (load run 2 re-inserted rows from run 1)
  const s4 = [
    { ref: 'RCPT-48807', date: '2026-05-14', amt: 18420.0, cp: 'Quarrystone Homes Construction' },
    { ref: 'RCPT-48812', date: '2026-05-15', amt: 7965.5, cp: 'Kestrelmoor Renovations' },
    { ref: 'RCPT-48830', date: '2026-05-19', amt: 23110.75, cp: 'Elmhaven Developments' },
  ];
  for (const s of s4) {
    for (const run of [1, 2]) {
      push(cust('CUS-1024'), { date: s.date, amount: s.amt, direction: 'credit', channel: 'eft', counterparty: s.cp, counterpartyCountry: 'CA', reference: s.ref, branch: null, loadRun: run });
    }
  }

  // S5 – decimal scale defect (×100)
  push(cust('CUS-1031'), { date: '2026-05-27', amount: 1245000.0, direction: 'credit', channel: 'eft', counterparty: 'Quillmere Grain Co-operative', counterpartyCountry: 'CA', reference: 'RCPT-55821', branch: null });

  // S6 – cash just below $10,000, then wire out
  const s6 = [
    { d: '2026-06-08', a: 9400, b: 'BR-014 Centretown' },
    { d: '2026-06-09', a: 9850, b: 'BR-022 Westboro' },
    { d: '2026-06-10', a: 9600, b: 'BR-014 Centretown' },
    { d: '2026-06-12', a: 9900, b: 'BR-031 Orléans' },
  ];
  for (const s of s6) push(cust('CUS-1015'), { date: s.d, amount: s.a, direction: 'credit', channel: 'cash', counterparty: 'Cash deposit', counterpartyCountry: 'CA', reference: `CSH-${refCounter++}`, branch: s.b });
  push(cust('CUS-1015'), { date: '2026-06-13', amount: 37000, direction: 'debit', channel: 'wire_domestic', counterparty: 'Ridgeback Auto Brokers', counterpartyCountry: 'CA', reference: `WIR-${refCounter++}`, branch: null });

  // S7 – rapid pass-through at a trading company
  push(cust('CUS-1027'), { date: '2026-06-18', amount: 85000, direction: 'credit', channel: 'wire_domestic', counterparty: 'Tamsin Retail Group', counterpartyCountry: 'CA', reference: `WIR-${refCounter++}`, branch: null });
  push(cust('CUS-1027'), { date: '2026-06-19', amount: 41000, direction: 'debit', channel: 'wire_international', counterparty: 'Okubaru Freight Forwarding KK', counterpartyCountry: 'JP', reference: `WIX-${refCounter++}`, branch: null });
  push(cust('CUS-1027'), { date: '2026-06-19', amount: 38500, direction: 'debit', channel: 'wire_domestic', counterparty: 'Norhaven Sourcing Ltd', counterpartyCountry: 'CA', reference: `WIR-${refCounter++}`, branch: null });

  // S8 – documented seasonal spike (spread over the month so velocity is not triggered)
  const clients = ['Residential client', 'Fernvale Property Mgmt', 'Silvermere Condo Corp', 'Residential client', 'Brackenridge Townhomes'];
  for (let i = 0; i < 14; i++) {
    push(cust('CUS-1003'), {
      date: addDays('2026-05-01', i * 2 + 1), amount: rng.money(3500, 6500), direction: 'credit', channel: 'eft',
      counterparty: clients[i % clients.length], counterpartyCountry: 'CA', reference: `RCPT-${refCounter++}`, branch: null,
    });
  }

  // ---- Finalize ----
  txs.sort((a, b) => a.date.localeCompare(b.date) || a.customerId.localeCompare(b.customerId) || a.reference.localeCompare(b.reference) || (a.loadRun ?? 0) - (b.loadRun ?? 0));
  txs.forEach((t, i) => (t.txId = `TX-${String(i + 1).padStart(5, '0')}`));

  const migrationBatches: MigrationBatch[] = [
    { batchId: 'MIG-0611', loadedOn: '2026-06-11', rowCount: txs.filter((t) => t.migrationBatch === 'MIG-0611').length, knownDefects: [] },
    {
      batchId: 'MIG-0612', loadedOn: '2026-06-12', rowCount: txs.filter((t) => t.migrationBatch === 'MIG-0612').length,
      knownDefects: [
        { defectId: 'DEF-031', field: 'amount', description: 'Amount field scale mapping: some rows loaded with implied-decimal amounts not divided by 100.' },
        { defectId: 'DEF-032', field: 'load_run', description: 'Batch re-run after timeout without an idempotent load key; some rows from run 1 inserted again in run 2.' },
      ],
    },
  ];

  // Source-ERP document amounts for migrated business receipts (one per reference — the source of truth).
  const erpDocuments: AmlDataset['erpDocuments'] = [];
  const seen = new Set<string>();
  for (const t of txs) {
    if (t.sourceSystem !== 'MIGRATED_LEDGER' || !t.reference.startsWith('RCPT-') || seen.has(t.reference)) continue;
    seen.add(t.reference);
    erpDocuments.push({
      reference: t.reference, customerId: t.customerId,
      erpAmount: t.reference === 'RCPT-55821' ? 12450.0 : t.amount,
      erpDocId: `AR-PMT-${t.reference.slice(5)}`,
    });
  }

  return { seed, asOf: AS_OF, periodStart: PERIOD_START, periodEnd: PERIOD_END, customers, transactions: txs, migrationBatches, erpDocuments };
}
