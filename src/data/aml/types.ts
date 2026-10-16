/** Synthetic AML dataset types. Every record is fictional. */

export type CustomerType = 'individual' | 'business';
export type RiskRating = 'low' | 'medium' | 'high';
export type KycStatus = 'verified' | 'refresh_due' | 'incomplete';
export type Channel = 'eft' | 'wire_domestic' | 'wire_international' | 'cash' | 'card' | 'internal';
export type SourceSystem = 'CORE_LIVE' | 'MIGRATED_LEDGER';

export interface CustomerDocument {
  docId: string;
  date: string;
  type: 'kyc_note' | 'rfi_sent' | 'rfi_response' | 'recon_report' | 'defect_log';
  summary: string;
  /**
   * Rule IDs this document can *explain* (for example, documented seasonality explains an
   * inflow spike). "Close as explained exception" is only allowed when every triggered rule is
   * covered by at least one document.
   */
  explainsRules: string[];
}

export interface Customer {
  customerId: string;
  name: string;
  type: CustomerType;
  segment: 'retail' | 'small_business' | 'commercial';
  /** Declared business activity or occupation category, captured at onboarding (KYC). */
  activity: string;
  accountPurpose: string;
  /** Declared typical monthly credits (CAD). */
  declaredMonthlyTurnover: number;
  /** Declared typical number of transactions per month. */
  expectedMonthlyTxCount: number;
  accountOpened: string;
  kycStatus: KycStatus;
  kycLastReview: string;
  /** Product / channel factors used to derive the customer risk rating. No demographic attributes are used. */
  riskFactors: string[];
  riskRating: RiskRating;
  accountId: string;
  /** Whether the declared account purpose includes international payments. */
  internationalExpected: boolean;
  documents: CustomerDocument[];
  /** Scenario this customer was seeded for, if any (null = baseline population). */
  scenarioId: string | null;
}

export interface Transaction {
  txId: string;
  customerId: string;
  accountId: string;
  date: string;
  /** Always positive; see direction. */
  amount: number;
  direction: 'credit' | 'debit';
  channel: Channel;
  counterparty: string;
  counterpartyCountry: string;
  reference: string;
  branch: string | null;
  sourceSystem: SourceSystem;
  migrationBatch: string | null;
  loadRun: number | null;
}

export interface MigrationBatch {
  batchId: string;
  loadedOn: string;
  rowCount: number;
  knownDefects: { defectId: string; description: string; field: string }[];
}

export interface AmlDataset {
  seed: number;
  asOf: string;
  periodStart: string;
  periodEnd: string;
  customers: Customer[];
  transactions: Transaction[];
  migrationBatches: MigrationBatch[];
  /** Amounts recorded in the source ERP for migrated references (used by the ERP cross-check). */
  erpDocuments: { reference: string; customerId: string; erpAmount: number; erpDocId: string }[];
}
