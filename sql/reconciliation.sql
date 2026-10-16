-- ============================================================================
-- Source-to-target reconciliation in SQL (SQLite 3.25+ for window functions).
-- Implements the same rules (M0–M5) as src/engine/recon/match.ts.
-- scripts/check_sql.py runs this file and asserts that the results are
-- identical, row for row, to the TypeScript matcher.
-- ============================================================================

-- M0: normalized references (trim, upper-case, strip spaces, hyphens, U+FFFD)
DROP VIEW IF EXISTS v_src;
CREATE VIEW v_src AS
SELECT s.*, UPPER(REPLACE(REPLACE(REPLACE(TRIM(s.reference), ' ', ''), '-', ''), char(65533), '')) AS norm_ref
FROM legacy_extract s;

DROP VIEW IF EXISTS v_tgt;
CREATE VIEW v_tgt AS
SELECT t.*, UPPER(REPLACE(REPLACE(REPLACE(TRIM(t.reference), ' ', ''), '-', ''), char(65533), '')) AS norm_ref
FROM erp_gl_entry t
WHERE t.status = 'POSTED';                               -- M5: reversed entries are ignored

DROP VIEW IF EXISTS recon_result;
CREATE VIEW recon_result AS
WITH
-- M1: key match on customer + normalized reference, ranked by closeness
key_candidates AS (
  SELECT s.src_id, t.je_id,
         ABS(t.amount - s.amount)                                   AS amt_gap,
         ABS(julianday(t.posting_date) - julianday(s.posting_date)) AS day_gap,
         t.load_run
  FROM v_src s
  JOIN v_tgt t ON t.customer_id = s.customer_id AND t.norm_ref = s.norm_ref
),
ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY src_id ORDER BY amt_gap, day_gap, load_run, je_id) AS rn
  FROM key_candidates
),
best AS (SELECT src_id, je_id FROM ranked WHERE rn = 1),
-- M3: extra key-matched targets with the same amount and a date within 1 day of the chosen one
dups AS (
  SELECT r.src_id, r.je_id
  FROM ranked r
  JOIN best b       ON b.src_id = r.src_id
  JOIN v_tgt bt     ON bt.je_id = b.je_id
  JOIN v_tgt rt     ON rt.je_id = r.je_id
  WHERE r.rn > 1
    AND ABS(rt.amount - bt.amount) <= 0.005
    AND ABS(julianday(rt.posting_date) - julianday(bt.posting_date)) <= 1
),
claimed AS (SELECT je_id FROM best UNION SELECT je_id FROM dups),
-- M2: fuzzy match for sources still unmatched
fuzzy AS (
  SELECT s.src_id, MIN(t.je_id) AS je_id
  FROM v_src s
  JOIN v_tgt t
    ON t.customer_id = s.customer_id
   AND ABS(t.amount - s.amount) <= 0.005
   AND ABS(julianday(t.posting_date) - julianday(s.posting_date)) <= 3
   AND SUBSTR(t.norm_ref, 1, 4) = SUBSTR(s.norm_ref, 1, 4)
  WHERE s.src_id NOT IN (SELECT src_id FROM best)
    AND t.je_id NOT IN (SELECT je_id FROM claimed)
  GROUP BY s.src_id
),
pairs AS (
  SELECT src_id, je_id, 'M1' AS matched_by FROM best
  UNION ALL
  SELECT src_id, je_id, 'M2' FROM fuzzy
),
-- M4: classify pairs — first failing check wins
classified AS (
  SELECT p.src_id, p.je_id, p.matched_by,
         CASE
           WHEN ABS(t.amount - s.amount) > 0.005                                      THEN 'AMOUNT_MISMATCH'
           WHEN ABS(julianday(t.posting_date) - julianday(s.posting_date)) > 3         THEN 'DATE_MISMATCH'
           WHEN t.gl_account <> m.gl_account                                          THEN 'WRONG_MAPPING'
           WHEN t.reference <> s.reference                                            THEN 'REFERENCE_CORRUPTED'
           ELSE 'MATCHED'
         END AS status
  FROM pairs p
  JOIN v_src s      ON s.src_id = p.src_id
  JOIN v_tgt t      ON t.je_id = p.je_id
  JOIN gl_mapping m ON m.segment = s.segment
)
SELECT src_id, je_id, matched_by, status FROM classified
UNION ALL
SELECT src_id, je_id, 'M1', 'DUPLICATE_IN_TARGET' FROM dups
UNION ALL                                                -- M5: unpaired sources
SELECT s.src_id, NULL, NULL, 'MISSING_IN_TARGET'
FROM v_src s WHERE s.src_id NOT IN (SELECT src_id FROM pairs)
UNION ALL                                                -- M5: unclaimed targets
SELECT NULL, t.je_id, NULL, 'UNMATCHED_IN_TARGET'
FROM v_tgt t
WHERE t.je_id NOT IN (SELECT je_id FROM claimed) AND t.je_id NOT IN (SELECT je_id FROM fuzzy);

-- ---------------------------------------------------------------------------
-- @query summary_by_status: Result count per reconciliation status
SELECT status, COUNT(*) AS results
FROM recon_result
GROUP BY status
ORDER BY results DESC, status;

-- @query amount_mismatch_patterns: Amount differences with a pattern hint
SELECT s.reference, s.amount AS source_amount, t.amount AS erp_amount,
       ROUND(t.amount - s.amount, 2) AS difference,
       CASE
         WHEN ROUND(t.amount / s.amount, 6) IN (100.0, 0.01)          THEN 'decimal shift'
         WHEN ABS(ROUND((t.amount - s.amount) * 100)) % 900 = 0       THEN 'divisible by 9 - check transposition'
         WHEN ABS(t.amount - s.amount) <= 0.05                        THEN 'rounding'
         ELSE 'unexplained'
       END AS pattern_hint
FROM recon_result r
JOIN legacy_extract s ON s.src_id = r.src_id
JOIN erp_gl_entry t   ON t.je_id = r.je_id
WHERE r.status = 'AMOUNT_MISMATCH'
ORDER BY s.reference;

-- @query duplicates_by_load_run: Duplicate imports and the load runs they came from
SELECT s.reference, s.amount, k.je_id AS kept_entry, k.load_run AS kept_run, d.je_id AS duplicate_entry, d.load_run AS duplicate_run, d.migration_batch
FROM recon_result r
JOIN legacy_extract s ON s.src_id = r.src_id
JOIN erp_gl_entry d   ON d.je_id = r.je_id
JOIN recon_result rk  ON rk.src_id = r.src_id AND rk.status <> 'DUPLICATE_IN_TARGET'
JOIN erp_gl_entry k   ON k.je_id = rk.je_id
WHERE r.status = 'DUPLICATE_IN_TARGET'
ORDER BY s.reference;

-- @query missing_with_staging_reason: Source rows missing in the ERP, with the staging-log reason
SELECT s.src_id, s.reference, s.amount, g.load_status, g.reject_reason
FROM recon_result r
JOIN legacy_extract s ON s.src_id = r.src_id
LEFT JOIN staging_log g ON g.src_id = s.src_id
WHERE r.status = 'MISSING_IN_TARGET'
ORDER BY s.src_id;

-- @query date_swaps: Date differences explained by a day/month swap
SELECT s.reference, s.posting_date AS source_date, t.posting_date AS erp_date,
       CASE WHEN SUBSTR(s.posting_date, 6, 2) = SUBSTR(t.posting_date, 9, 2)
             AND SUBSTR(s.posting_date, 9, 2) = SUBSTR(t.posting_date, 6, 2)
            THEN 'day/month swapped' ELSE 'other shift' END AS diagnosis
FROM recon_result r
JOIN legacy_extract s ON s.src_id = r.src_id
JOIN erp_gl_entry t   ON t.je_id = r.je_id
WHERE r.status = 'DATE_MISMATCH'
ORDER BY s.reference;

-- @query control_totals: Control totals — source vs. posted ERP
SELECT (SELECT ROUND(SUM(amount), 2) FROM legacy_extract)                      AS source_total,
       (SELECT ROUND(SUM(amount), 2) FROM erp_gl_entry WHERE status = 'POSTED') AS erp_total,
       (SELECT ROUND(SUM(amount), 2) FROM erp_gl_entry WHERE status = 'POSTED')
     - (SELECT ROUND(SUM(amount), 2) FROM legacy_extract)                      AS net_difference;
