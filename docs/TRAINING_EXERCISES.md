# Training exercises

Exercises that use the live site and the repository. All data is synthetic; case IDs are stable because the data is seeded.
Load the SQLite data first: `sqlite3 demo.db < data/seed_sqlite.sql`.

## AML investigation
1. **CASE-260107 (cash just below $10,000).** List every indicator, then write a 150-word escalation rationale citing evidence items by name. Why is closure blocked?
2. **CASE-260103 vs. CASE-260107.** Both fire R2 and R4. Explain, using only the evidence panel, why one is a data defect and the other is not.
3. **CASE-260105 (escrow wire).** The KYC note mentions a planned property sale. Is a note “documentation”? Draft the request for information you would send.
4. **CASE-260106 (trading company).** Argue for and against escalation. What additional data would change your view?
5. **CASE-260104 (seasonal spike).** After closing, what change to the customer profile would prevent the alert from recurring, and what is the risk of making it?
6. Explain why the risk rating uses product/channel factors and not demographics. Name two proxies to avoid.

## SQL
1. Write R1 (rolling 7-day velocity) from scratch against `txn`/`customer`; compare with `sql/aml_rules.sql`.
2. Write a query that finds migrated rows whose amount differs from `erp_document`. Extend it to classify ×100 / ÷100 ratios.
3. In `sql/reconciliation.sql`, explain why `ROW_NUMBER() OVER (PARTITION BY src_id …)` is needed, and what breaks if two sources could claim the same ERP entry.
4. Write a query returning control totals by GL account for source vs. ERP, and reconcile the net difference to the exception list.
5. Using `fact_payment`, compute month-over-month growth by channel with a window function.

## Reconciliation & migration
1. Without looking at the code, describe how you would detect a day/month swap. Then read `DATE_DAY_MONTH_SWAP` in `src/engine/recon/match.ts`.
2. Why does the matcher refuse to use `staging_row_id`? When would you use lineage keys anyway?
3. The two manual journals sum to the remaining net difference. What evidence would finance need to keep them?
4. Propose a reconciliation sign-off checklist for a migration (counts, totals, exceptions by type, approvals).

## Payment API & architecture
1. Why is the idempotency key derived from the ERP document and not a random UUID per request?
2. Walk through “timeout after commit” with and without idempotency, step by step, naming every state change in the ERP and the bank.
3. Which HTTP statuses should be retried, and why is 422 not one of them?
4. Design the status-inquiry flow for NEEDS_REVIEW payments. What would you add to the mock bank?
5. Explain mTLS vs. OAuth client credentials, and where each secret lives.

## Data engineering
1. Disable V5 (customer integrity). What happens to `segment` in the facts, and why is that dangerous for reporting?
2. D2 keeps the latest version of a document. Give a case where that is wrong and design a safer rule.
3. Why are data-quality dimensions measured independently of which rules are enabled?

## Interview practice (answer in 2 minutes each)
- “Tell me about a time an alert turned out to be a data problem.” (Use the S5 pattern; describe the real experience in general terms only.)
- “How do you decide between requesting information and escalating?”
- “How would you reconcile a migration of 10 million rows?” (Sampling vs. full, control totals, partitioning, exception workflow.)
- “How do you make a payment integration safe to retry?”
- “What would you change to put this AML lab into production?” (Data feeds, tuning, case management, model governance, audit, access control.)
