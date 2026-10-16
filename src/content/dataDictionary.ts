/** Data dictionary for every synthetic table. Rendered on /data-dictionary and exported to docs/DATA_DICTIONARY.md. */
export interface TableDoc { table: string; lab: string; grain: string; seed: string; columns: [name: string, type: string, description: string][] }

export const DATA_DICTIONARY: TableDoc[] = [
  {
    table: 'customer', lab: 'AML', grain: 'One row per fictional customer (one account each).', seed: 'AML_SEED = 20260630',
    columns: [
      ['customer_id', 'text', 'CUS-1001 … CUS-1040. Scenario customers have fixed IDs.'],
      ['name', 'text', 'Fictional person or business name.'],
      ['customer_type', 'text', 'individual | business.'],
      ['segment', 'text', 'retail | small_business | commercial.'],
      ['activity', 'text', 'Declared occupation or business activity (KYC).'],
      ['account_purpose', 'text', 'Declared purpose of the account (KYC).'],
      ['declared_monthly_turnover', 'real', 'Declared typical monthly credits, CAD.'],
      ['expected_monthly_tx_count', 'integer', 'Declared typical transactions per month.'],
      ['international_expected', 'integer', '1 if international payments are part of the declared purpose.'],
      ['account_id', 'text', 'ACC-nnnn-P (personal) or -B (business).'],
      ['account_opened', 'date', 'Account opening date.'],
      ['kyc_status', 'text', 'verified | refresh_due (last review > 365 days before as-of date) | incomplete.'],
      ['kyc_last_review', 'date', 'Date of last KYC review.'],
      ['risk_rating', 'text', 'low | medium | high — from product/channel factors only (cash-intensive, international, commercial, account < 12 months). No demographic attributes.'],
    ],
  },
  {
    table: 'txn', lab: 'AML', grain: 'One row per posting on a customer account, Apr 1 – Jun 30 2026.', seed: 'AML_SEED = 20260630',
    columns: [
      ['tx_id', 'text', 'TX-00001 … in date order.'],
      ['customer_id / account_id', 'text', 'Owner of the posting.'],
      ['tx_date', 'date', 'Posting date.'],
      ['amount', 'real', 'Positive amount, CAD.'],
      ['direction', 'text', 'credit (in) | debit (out).'],
      ['channel', 'text', 'eft | wire_domestic | wire_international | cash | card | internal.'],
      ['counterparty / counterparty_country', 'text', 'Fictional counterparty and ISO country code.'],
      ['reference', 'text', 'Payment reference (RCPT-, EFT-, WIR-, WIX-, CSH-, CRD-, INT-).'],
      ['branch', 'text', 'Branch for cash transactions, else NULL.'],
      ['source_system', 'text', 'MIGRATED_LEDGER (Apr–May, loaded by migration) | CORE_LIVE (June).'],
      ['migration_batch', 'text', 'MIG-0611 (April) | MIG-0612 (May) | NULL.'],
      ['load_run', 'integer', 'Load run within the batch; 2 = re-run (duplicate defect DEF-032).'],
    ],
  },
  {
    table: 'erp_document', lab: 'AML', grain: 'One row per migrated business receipt reference.', seed: 'Derived from txn',
    columns: [['reference', 'text', 'Receipt reference.'], ['customer_id', 'text', 'Customer.'], ['erp_amount', 'real', 'Amount in the source ERP document (source of truth).'], ['erp_doc_id', 'text', 'AR-PMT-nnnnn.']],
  },
  {
    table: 'legacy_extract', lab: 'Reconciliation', grain: 'One row per legacy-core posting for May 2026 (source).', seed: 'RECON_SEED = 612',
    columns: [['src_id', 'text', 'LEG-000001 …'], ['extract_row', 'integer', 'Row number in legacy_core_extract_2026-05.csv.'], ['posting_date', 'date', 'Posting date.'], ['customer_id', 'text', 'Customer.'], ['segment', 'text', 'RT retail | SB small business | CM commercial.'], ['reference', 'text', 'Reference as recorded in the legacy system.'], ['amount', 'real', 'Amount, CAD.'], ['description', 'text', 'Free text.']],
  },
  {
    table: 'erp_gl_entry', lab: 'Reconciliation', grain: 'One row per ERP general-ledger entry (target).', seed: 'RECON_SEED = 612',
    columns: [['je_id', 'text', 'JE-26-nnnnn (migrated), MJ-nnnn (manual journal), JE-COR-nnn (correction).'], ['posting_date', 'date', 'Posting date in the ERP.'], ['gl_account', 'text', '2100 Customer deposits – business | 2110 Customer deposits – retail.'], ['reference', 'text', 'Reference as loaded (may be corrupted).'], ['amount', 'real', 'Amount as loaded.'], ['customer_id', 'text', 'NULL for manual journals.'], ['migration_batch / load_run', 'text / int', 'Lineage of the load.'], ['staging_row_id', 'text', 'Pointer to staging_log (not used for matching).'], ['entry_type', 'text', 'MIGRATED | MANUAL_JOURNAL | CORRECTION.'], ['status', 'text', 'POSTED | REVERSED.']],
  },
  {
    table: 'staging_log', lab: 'Reconciliation', grain: 'One row per legacy row passing through staging.', seed: 'RECON_SEED = 612',
    columns: [['staging_row_id', 'text', 'STG-000001 …'], ['src_id / extract_row', 'text / int', 'Source row.'], ['mapping_version', 'text', 'v1.3 approved; v1.2 has the SB → 2110 mapping defect.'], ['load_status', 'text', 'LOADED | REJECTED.'], ['reject_reason', 'text', 'Reason for rejection.'], ['load_runs', 'text', 'Comma-separated runs in which the row was inserted.']],
  },
  {
    table: 'gl_mapping', lab: 'Reconciliation', grain: 'One row per customer segment.', seed: 'Fixed',
    columns: [['segment', 'text', 'RT | SB | CM.'], ['gl_account', 'text', 'Expected GL account.'], ['gl_name', 'text', 'Account name.']],
  },
  {
    table: 'raw deliveries (pipeline_raw.json)', lab: 'Data engineering', grain: 'One row per delivered record, as strings.', seed: 'PIPELINE_SEED = 909',
    columns: [['rawId', 'text', 'RAW-00001 …'], ['source', 'text', 'card_settlement | eft_receipts | erp_ar_receipts.'], ['ingestedAt', 'timestamp', 'Delivery time (later = more recent version).'], ['payload', 'object', 'Source-specific fields; see the Standardize stage in the lab.']],
  },
  {
    table: 'fact_payment', lab: 'Data engineering', grain: 'One row per unique, valid payment after deduplication.', seed: 'Derived',
    columns: [['payment_key', 'text', 'F-00001 …'], ['date_key / month', 'date / text', 'Transaction date and YYYY-MM.'], ['customer_key', 'text', 'FK to dim_customer.'], ['channel', 'text', 'Card | EFT | AR receipt.'], ['currency / amount_original', 'text / real', 'As delivered (EFT converted from cents).'], ['fx_rate / amount_cad', 'real', 'Monthly rate to CAD and converted amount (NULL if no rate).'], ['natural_key', 'text', 'source:document number.'], ['lineage_raw_ids', 'text', 'All raw deliveries merged into this row.']],
  },
  {
    table: 'dim_customer', lab: 'Data engineering', grain: 'One row per customer.', seed: 'Fixed',
    columns: [['customer_key', 'text', 'C-001 … C-010.'], ['name', 'text', 'Fictional name.'], ['segment', 'text', 'Retail | Small business | Commercial.'], ['region', 'text', 'Canadian city.']],
  },
];
