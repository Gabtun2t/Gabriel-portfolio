# Recruiter walkthrough

Everything runs in the browser; no sign-in. Decisions you record stay in your browser.

## 30-second version
Home page → headline, four practice areas, and a live panel with the three highest-scoring synthetic alerts. Click any alert to land inside a case.

## AML / financial-crime hiring manager (≈5 min)
1. **Project lab → AML lab → Alert queue.** Filter “High”; open the cash case (Marcus Lindqvist).
2. Read **Why this alert was generated** — each rule shows the observed value, threshold, window and transactions.
3. Review the **customer profile & KYC-related information** and the **evidence panel** (KYC currency, expected vs. actual, lineage, duplicates, ERP cross-check, counterparties, documents, re-evaluation).
4. Note that **Close as explained exception** is disabled, with the reason.
5. Choose **Escalate to compliance**, write a rationale, tick reviewed evidence, record it. Read the **teaching note**, then **View / export narrative** (marked SIMULATION).
6. Compare with the **Northgate** case: same rules fire, but the ERP cross-check shows ×100 and the re-evaluation shows no rule fires on corrected data.

## ERP / financial-systems manager (≈5 min)
1. **Reconciliation lab → Run reconciliation.**
2. Filter **Amount difference** — inspect the decimal shift (×100), digit transposition (divisible by 9) and rounding.
3. Open a **Missing in ERP** row — lineage shows the staging rejection reason.
4. **Apply all proposed corrections → Re-run validation.** 176/176 source rows match; two manual journals remain for finance review.
5. Scroll to the **SQL** panel — the same reconciliation in SQL, verified row-for-row against SQLite.

## Architect / data manager (≈5–10 min)
1. **Payment API lab → “Timeout after bank commit”** → one debit, replayed 201. Then **“idempotency OFF”** → two debits, reconciliation flags DUPLICATE PAYMENT.
2. Read the design decisions and security notes under the architecture diagram.
3. **Data lab** → Validate stage: untick “Currency has an FX rate” and watch the unconverted-amount warning; check the **lineage tracer** for a deduplicated fact.
4. **Architecture** page for the end-to-end diagrams; **Build status** page for what is and isn’t implemented.
