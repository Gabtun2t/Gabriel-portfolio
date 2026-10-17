# Gabriel Olatundun — Interactive Professional Portfolio

**Senior Financial Systems & Integration Specialist** · Ottawa, Ontario, Canada

**Live site:** https://gabtun2t.github.io/Gabriel-portfolio/ (GitHub Pages, deployed by GitHub Actions on every push to `main`)

A static, deployable portfolio website with four working labs on reproducible synthetic data:

| Lab | What a visitor can do | Status |
|---|---|---|
| **1. AML transaction monitoring & investigation** (flagship) | Filter/sort/search an alert queue, open a case, review the KYC-related profile, triggered rules, transaction history and 8 evidence checks, record a reasoned disposition, export a case narrative marked SIMULATION | Implemented, tested |
| **2. ERP reconciliation & migration integrity** | Run a legacy-extract vs. ERP-ledger reconciliation, inspect matches/exceptions, trace lineage and root cause, apply corrections, re-run validation, read SQL verified on SQLite | Implemented, tested |
| **3. Mock bank payment API ↔ ERP** | Send payments to an in-memory mock bank, inject 503/429/timeout/422 faults, watch retries, idempotent replay, audit trail and ERP ↔ bank reconciliation | Implemented, tested |
| **4. Financial data engineering** | Run three raw feeds through standardize → validate/quarantine → deduplicate → star schema → metrics; toggle rules; trace any fact to its raw records | Implemented, tested |

The full feature table (implemented / partial / planned) is in [`docs/FEATURE_STATUS.md`](docs/FEATURE_STATUS.md) and on the site at `#/status`.

---

## Real vs. simulated — read this first

- **Professional facts** (roles, dates, education, skills, credentials, AML-related work) come only from Gabriel’s latest resume and are kept in [`src/content/profile.ts`](src/content/profile.ts).
- **Everything in the labs is synthetic**: the institution (“Harbourline Community Finance”), customers, accounts, transactions, ledgers, vendors and outcomes are fictional and generated from fixed seeds. The labs are independent portfolio simulations — not client engagements, production systems, or reproductions of any employer’s or client’s software.
- **Not claimed**: CAMS or other AML certification, STR/SAR or FINTRAC filing, specific AML vendor tools, investigation counts, quantified outcomes, endorsements.
- Alerts and risk indicators are prompts for professional review. The simulation never determines fraud or makes reporting decisions.
- Risk factors are product/channel based. No demographic attributes are used by any rule or score (asserted by a test).

## Quick start

**Prerequisites:** Node.js 20+ and npm. Python 3.8+ (standard library only) is needed for the SQL parity check. Chromium via Playwright is optional for the browser test.

```bash
npm install
npm run dev          # http://localhost:5173 (rebuilds on change)
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with rebuild on change (esbuild) |
| `npm run build` | Production build → `dist/` (static files) |
| `npm run preview` | Serve `dist/` on http://localhost:4173 |
| `npm test` | Engine unit tests (Node’s built-in test runner) — 78 tests |
| `npm run seed` | Regenerate CSVs, `data/seed_sqlite.sql`, expected results and generated docs |
| `npm run test:sql` | Run the SQL files on SQLite and assert parity with the TypeScript engines; refresh `src/generated/sql_snapshot.json` |
| `npm run test:e2e` | Browser smoke test of every route and core lab flow (needs `npm run preview` running; `npx playwright install chromium` once) |
| `npm run preview:pages` | Serve `dist/` at http://localhost:4174/Gabriel-portfolio/ — the same base path as GitHub Pages |
| `npm run test:release` | The 20-point release QA (pathways, AML workflow incl. persistence and export, reconciliation, payments, data lab, downloads, links, mobile, keyboard, assets) against `preview:pages`; writes `test-results/release-qa.json` |
| `npm run images` | Regenerate `public/og-image.png` and `public/apple-touch-icon.png` |
| `npm run typecheck` | Strict TypeScript check of engines, data generators, scripts and tests |
| `npm run typecheck:all` | Also checks the React UI (needs `@types/react`, installed by `npm install`; runs in CI) |
| `npm run verify` | typecheck → test → seed → test:sql → build |

## How it is built

- **Static single-page app**: React 19 + TypeScript, bundled by esbuild ([`scripts/build.mjs`](scripts/build.mjs)). Hash routing (`#/labs/aml?case=…`) so every view is deep-linkable on any static host with no rewrite rules.
- **No backend, database or secrets.** All computation happens in the browser; it hosts free and cannot leak anything.
- **Engines are plain TypeScript modules** with no UI dependencies:
  - [`src/engine/aml`](src/engine/aml) — rules, scoring, evidence checks, evidence-supported data corrections, disposition validation, narrative
  - [`src/engine/recon`](src/engine/recon) — matcher (rules M0–M5), root-cause classification, corrections journal
  - [`src/engine/payments`](src/engine/payments) — schema validation, idempotency keys (SHA-256), mock bank with faults, retries/back-off, audit, reconciliation
  - [`src/engine/pipeline`](src/engine/pipeline) — standardize, validate, deduplicate, transform, metrics, lineage
- **Seeded generators** in [`src/data`](src/data) (mulberry32 PRNG) recreate identical datasets in the browser, in tests and in the export script. Seeds: AML `20260630`, reconciliation `612`, pipeline `909`.
- **SQL**: [`sql/`](sql) holds the schema, the full reconciliation in SQL, five AML rules and an ERP cross-check in SQL and analytical queries over the star schema. [`scripts/check_sql.py`](scripts/check_sql.py) runs them on SQLite and asserts they return the same results as the TypeScript engines; the website displays that real SQLite output.
- **Inspectable code**: code blocks on the lab pages are imported from the running source files (`?raw` imports), not copied.

### Project layout

```
index.html                 HTML shell (fonts, meta)
public/                    static assets: favicon, resume PDF, downloadable data
scripts/build.mjs          esbuild build + dev server (+ --single inlined build)
scripts/export-seed-data.ts  CSV / SQLite / expected-results / docs export
scripts/check_sql.py       SQL parity check (Python stdlib)
sql/                       schema.sql, reconciliation.sql, aml_rules.sql, pipeline_model.sql
src/content/               profile (resume facts), data dictionary, feature status
src/data/                  seeded generators (aml, recon, pipeline)
src/engine/                business logic (pure TypeScript)
src/pages/                 one file per page / lab
src/components/            UI primitives, SVG charts and diagrams, SQL panel
src/generated/             sql_snapshot.json (written by check_sql.py)
tests/                     unit tests (*.test.ts) and e2e/smoke.mjs
docs/                      data dictionary, AML scenarios, feature status, walkthrough, exercises
data/                      generated CSV + seed_sqlite.sql + expected results
```

## Deployment

**Current:** GitHub Pages, published by [`.github/workflows/pages.yml`](.github/workflows/pages.yml) from `main` of https://github.com/gabtun2t/Gabriel-portfolio.

- Every push runs `typecheck → test → seed → test:sql → build`; the site is published only if all steps pass.
- The site uses hash routing and relative asset paths, so it works under the `/Gabriel-portfolio/` base path with no rewrite rules. Deep links (e.g. `#/labs/aml?tab=case&case=CASE-260103`) survive refresh.
- Each build stamps its commit and time into `<meta name="build-commit">` / `<meta name="build-time">` and the build-status page.
- Repository **Settings → Pages → Source** must stay on **GitHub Actions**.

To deploy a change: commit to `main` and push. Check the run under the repository’s **Actions** tab, then open the live site and confirm the build-status page shows the new commit.

Alternatives (not in use): Netlify ([`netlify.toml`](netlify.toml)) or Vercel ([`vercel.json`](vercel.json)) can build the same repository unchanged.

## Configuration

| Item | Where | Current state |
|---|---|---|
| LinkedIn URL | `src/content/profile.ts` → `linkedinUrl` | `https://www.linkedin.com/in/tunde-o-tech` (verified by Gabriel) |
| Email | `src/content/profile.ts` → `email` | `gabriel.olatundun@gmail.com` (from the resume) |
| Phone | `src/content/profile.ts` → `phone`, `showPhone` | `902-880-9877`, shown (approved by Gabriel). Set `showPhone: false` to hide it from the footer and contact page; the resume PDF is a separate file. |
| Client names | `src/content/profile.ts`, `public/resume/` | None, by decision. Project examples are anonymised (sector and location only). |
| Resumes | `public/resume/` | Two independently positioned resumes: `Gabriel_Olatundun_ERP_Implementation_Resume.pdf` and `Gabriel_Olatundun_AML_Technology_Resume.pdf`. Content lives in `scripts/resumes/content.mjs`; `NODE_PATH=<node_modules with docx> node scripts/resumes/build.mjs <docx-out-dir>` writes editable DOCX files and converts them to PDF with LibreOffice. The DOCX files are kept outside the repository. |

## Owner checklist (not published on the site)

Facts to confirm before they can be published (the site currently states only what the resume supports):
- [ ] Industries for **banking, microfinance and oil & gas**: were these ERP implementations, or consulting/support engagements? The site shows them as “client projects (consulting)”.
- [ ] Your role on Softcodes implementations: lead consultant, or member of the delivery team? The site says “delivered … implementations and advisory support”, as on the resume.
- [ ] Industries of the Panni implementation clients (not shown today).
- [ ] Retail & e-commerce: confirm this comes from Acumatica support (commerce connectors) and not from an implementation.
- [ ] Logistics: confirm MDS Logistics was in-house IT support, not ERP implementation.
- [ ] Sage 300 modules you configured (beyond the bank payment integration), if you want them listed.

- [ ] Decide whether the phone number stays public (`showPhone`).
- [ ] After each release, open the live build-status page and confirm the commit, then record it in `DEPLOYMENT.lastVerified` (`src/content/status.ts`) if you want it shown.
- [ ] Do not add training completions, assessments or certifications to the site until they are actually completed.

## AI-assisted development

The code for this site and its labs was written with substantial help from AI coding tools (Anthropic’s Claude), working to requirements Gabriel set and reviewed. Gabriel decided what the labs demonstrate and approved all professional content. His employment history comes from his resume and is separate from the simulations. The same disclosure appears in the site footer and on the case-studies page.

## Known limitations

- Rule thresholds, weights and scenarios are illustrative and not calibrated on real data; no regulator’s requirements are implemented.
- AML rules are single-customer: no network/link analysis, sanctions, PEP or adverse-media screening.
- Visitor decisions and notes are stored in that browser’s `localStorage` only (not shared, not sent anywhere).
- SQL results on the site are captured from SQLite by the parity script; there is no live SQL console in the browser (a future option is sql.js/WebAssembly).
- The payment lab is a single-process mock with a simulated clock; security controls (mTLS, OAuth, signing) are documented, not implemented.
- The data pipeline is batch, in-memory, single-run (no incremental loads, SCDs or orchestration).
- Accessibility basics are implemented and checked (labels, keyboard, focus, contrast tokens, responsive tables, skip link); no formal WCAG audit has been performed.
- CI (GitHub Actions) runs the full chain on every push: engine and UI type checks, 78 unit tests, SQL parity on SQLite, production build and the 20-point browser release QA under the Pages base path. The site deploys only if all of them pass.

## For the training assistant

The site is designed to be used for practice: see [`docs/TRAINING_EXERCISES.md`](docs/TRAINING_EXERCISES.md) for AML, SQL, reconciliation, API, architecture and interview exercises keyed to specific cases and queries, and [`docs/RECRUITER_WALKTHROUGH.md`](docs/RECRUITER_WALKTHROUGH.md) for the five-minute tours. Scenario answers and teaching notes are in [`docs/AML_SCENARIOS.md`](docs/AML_SCENARIOS.md).

---
© Gabriel Olatundun. Synthetic demonstration data only.
