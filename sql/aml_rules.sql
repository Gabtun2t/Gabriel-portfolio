-- ============================================================================
-- Selected AML monitoring rules expressed in SQL (SQLite).
-- Same logic and thresholds as src/engine/aml/rules.ts; scripts/check_sql.py
-- asserts that each query flags exactly the customers the TypeScript rules flag.
-- Educational simulation on synthetic data. A hit is a reason to review, not a finding.
-- ============================================================================

-- @query r1_high_velocity: R1 — busiest rolling 7-day window vs. max(10, 3 × expected weekly count)
WITH windows AS (
  SELECT a.customer_id, a.tx_date AS window_start, COUNT(*) AS tx_in_window
  FROM txn a
  JOIN txn b ON b.customer_id = a.customer_id
            AND b.tx_date BETWEEN a.tx_date AND date(a.tx_date, '+6 days')
  GROUP BY a.customer_id, a.tx_id
)
SELECT w.customer_id, MAX(w.tx_in_window) AS max_7d_count,
       ROUND(MAX(10.0, 3.0 * c.expected_monthly_tx_count / 4.33), 2) AS threshold
FROM windows w JOIN customer c USING (customer_id)
GROUP BY w.customer_id
HAVING MAX(w.tx_in_window) >= MAX(10.0, 3.0 * c.expected_monthly_tx_count / 4.33)
ORDER BY w.customer_id;

-- @query r2_large_vs_profile: R2 — single transaction ≥ max($10,000, 3 × declared monthly turnover)
SELECT t.customer_id, t.tx_id, t.tx_date, t.amount, t.reference,
       MAX(10000.0, 3.0 * c.declared_monthly_turnover) AS threshold
FROM txn t JOIN customer c USING (customer_id)
WHERE t.amount >= MAX(10000.0, 3.0 * c.declared_monthly_turnover)
ORDER BY t.customer_id, t.tx_date;

-- @query r3_cash_below_threshold: R3 — ≥ 3 cash deposits of $9,000–$9,999.99 within 7 days
WITH band AS (
  SELECT * FROM txn
  WHERE channel = 'cash' AND direction = 'credit' AND amount BETWEEN 9000 AND 9999.99
)
SELECT a.customer_id, a.tx_date AS window_start, COUNT(*) AS deposits, ROUND(SUM(b.amount), 2) AS total,
       COUNT(DISTINCT b.branch) AS branches
FROM band a
JOIN band b ON b.customer_id = a.customer_id
           AND julianday(b.tx_date) - julianday(a.tx_date) BETWEEN 0 AND 6
GROUP BY a.customer_id, a.tx_id
HAVING COUNT(*) >= 3
ORDER BY a.customer_id, window_start;

-- @query r4_monthly_inflow: R4 — calendar-month credits ≥ 3 × declared monthly turnover
SELECT t.customer_id, substr(t.tx_date, 1, 7) AS month, ROUND(SUM(t.amount), 2) AS credits,
       c.declared_monthly_turnover, ROUND(SUM(t.amount) / c.declared_monthly_turnover, 1) AS multiple
FROM txn t JOIN customer c USING (customer_id)
WHERE t.direction = 'credit'
GROUP BY t.customer_id, month
HAVING SUM(t.amount) >= 3 * c.declared_monthly_turnover
ORDER BY t.customer_id, month;

-- @query r5_duplicates: R5 — identical postings (reference, amount, direction, counterparty) within 1 day
SELECT account_id, customer_id, reference, amount, COUNT(*) AS copies,
       GROUP_CONCAT(COALESCE(migration_batch, source_system) || '/run ' || COALESCE(load_run, '-'), ', ') AS lineage
FROM txn
GROUP BY account_id, customer_id, reference, amount, direction, counterparty
HAVING COUNT(*) > 1 AND julianday(MAX(tx_date)) - julianday(MIN(tx_date)) <= 1
ORDER BY customer_id, reference;

-- @query erp_cross_check: Ledger vs. source ERP document amounts (where they differ)
SELECT t.tx_id, t.customer_id, t.reference, t.amount AS ledger_amount, d.erp_amount, d.erp_doc_id,
       ROUND(t.amount / d.erp_amount, 4) AS ratio, t.migration_batch
FROM txn t
JOIN erp_document d ON d.reference = t.reference AND d.customer_id = t.customer_id
WHERE ABS(t.amount - d.erp_amount) > 0.005;
