-- ============================================================================
-- Analytical queries over the star schema produced by the data pipeline
-- (fact_payment + dim_customer). scripts/check_sql.py compares
-- monthly_volume_by_channel with the TypeScript metrics.
-- ============================================================================

-- @query monthly_volume_by_channel: Monthly CAD volume by channel
SELECT month, channel, ROUND(SUM(amount_cad), 2) AS amount_cad, COUNT(*) AS payments
FROM fact_payment
WHERE amount_cad IS NOT NULL
GROUP BY month, channel
ORDER BY month, channel;

-- @query volume_by_segment: Volume by customer segment
SELECT COALESCE(d.segment, 'Unknown') AS segment, ROUND(SUM(f.amount_cad), 2) AS amount_cad, COUNT(*) AS payments
FROM fact_payment f
LEFT JOIN dim_customer d ON d.customer_key = f.customer_key
GROUP BY segment
ORDER BY amount_cad DESC;

-- @query top_customers: Top five customers by CAD volume
SELECT d.name, d.segment, ROUND(SUM(f.amount_cad), 2) AS amount_cad, COUNT(*) AS payments
FROM fact_payment f
JOIN dim_customer d ON d.customer_key = f.customer_key
GROUP BY d.customer_key
ORDER BY amount_cad DESC
LIMIT 5;

-- @query merged_lineage: Facts built from more than one raw delivery (deduplicated)
SELECT payment_key, natural_key, lineage_raw_ids
FROM fact_payment
WHERE lineage_raw_ids LIKE '%,%'
ORDER BY payment_key;
