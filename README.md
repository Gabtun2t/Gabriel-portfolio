# Gabriel Olatundun — Interactive Professional Portfolio

**Financial Systems, AML Investigations & Integration Architecture** · Ottawa, Ontario, Canada

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
| `npm test` | Engine unit tests (Node’s built-in test runner) — 73 tests |
| `npm run seed` | Regenerate CSVs, `data/seed_sqlite.sql`, expected results and generated docs |
| `npm run test:sql` | Run the SQL files on SQLite and assert parity with the TypeScript engines; refresh `src/generated/sql_snapshot.json` |
| `npm run test:e2e` | Browser smoke test of every route and core lab flow (needs `npm run preview` running; `npx playwright install chromium` once) |
| `npm run typecheck` | Strict TypeScript check of engines, data generators, scripts and tests |
| `npm run typecheck:all` | Also checks the React UI (needs `@types/react`, installed by `npm install`) |
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
- **SQL**: [`sql/`](sql) holds the schema, the full reconciliation in SQL, four AML rules in SQL and analytical queries over the star schema. [`scripts/check_sql.py`](scripts/check_sql.py) runs them on SQLite and asserts they return the same results as the TypeScript engines; the website displays that real SQLite output.
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

## Deploy (free static hosting)

The build output `dist/` is plain static files. **Deployment has not been performed** — it needs Gabriel’s account. Pick one:

### Option A — GitHub Pages (workflow included)
1. Create a repository (e.g. `gabriel-portfolio`) and push this project to `main`.
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) installs, tests, builds and publishes on every push to `main`.
4. The URL appears in the workflow run and under Settings → Pages (`https://<user>.github.io/gabriel-portfolio/`). Open it and click through the recruiter guide before sharing.

### Option B — Netlify
1. Log in to Netlify → **Add new site → Import an existing project** → choose the repository.
2. Netlify reads [`netlify.toml`](netlify.toml) (build `npm run build`, publish `dist`).
3. Or drag-and-drop the `dist/` folder onto **Sites → Deploy manually** after running `npm run build` locally.

### Option C — Vercel
1. **Add New → Project** → import the repository. [`vercel.json`](vercel.json) sets the build command and output directory.

### Custom domain
Add the domain in the host’s settings and create the DNS record it shows (CNAME for a subdomain such as `portfolio.example.com`). HTTPS is issued automatically by all three hosts.

## Configuration before publishing

| Item | Where | Current state |
|---|---|---|
| LinkedIn URL | `src/content/profile.ts` → `linkedinUrl` | `null` (hidden). Set the verified URL to show it in the footer and contact page. |
| Email | `src/content/profile.ts` → `email` | `gabriel.olatundun@gmail.com` (from the resume) |
| Phone | — | Not shown anywhere; the web resume PDF omits it |
| Client names | `src/content/profile.ts`, `public/resume/` | Withheld: “a bank payment API ↔ Sage 300 integration for a financial-services client”. Restore names only with approval. |
| Resume PDF | `public/resume/Gabriel_Olatundun_Resume.pdf` | Web copy generated from the supplied Word resume with the phone number and the two client names removed. Replace if the resume changes. |

## Known limitations

- Rule thresholds, weights and scenarios are illustrative and not calibrated on real data; no regulator’s requirements are implemented.
- AML rules are single-customer: no network/link analysis, sanctions, PEP or adverse-media screening.
- Visitor decisions and notes are stored in that browser’s `localStorage` only (not shared, not sent anywhere).
- SQL results on the site are captured from SQLite by the parity script; there is no live SQL console in the browser (a future option is sql.js/WebAssembly).
- The payment lab is a single-process mock with a simulated clock; security controls (mTLS, OAuth, signing) are documented, not implemented.
- The data pipeline is batch, in-memory, single-run (no incremental loads, SCDs or orchestration).
- Accessibility basics are implemented and checked (labels, keyboard, focus, contrast tokens, responsive tables, skip link); no formal WCAG audit has been performed.
- Built in an offline environment: `npm install` resolves current compatible versions; the UI typecheck (`typecheck:all`) needs `@types/react` and was not run in the build environment. Engine typecheck, unit tests, SQL parity, production build and the browser smoke test were run and pass.

## For the training assistant

The site is designed to be used for practice: see [`docs/TRAINING_EXERCISES.md`](docs/TRAINING_EXERCISES.md) for AML, SQL, reconciliation, API, architecture and interview exercises keyed to specific cases and queries, and [`docs/RECRUITER_WALKTHROUGH.md`](docs/RECRUITER_WALKTHROUGH.md) for the five-minute tours. Scenario answers and teaching notes are in [`docs/AML_SCENARIOS.md`](docs/AML_SCENARIOS.md).

---
© Gabriel Olatundun. Synthetic demonstration data only.
