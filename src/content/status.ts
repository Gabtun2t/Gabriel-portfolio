/** Feature status — rendered on /status and exported to docs/FEATURE_STATUS.md. Keep honest. */

export const DEPLOYMENT = {
  platform: 'GitHub Pages, published by GitHub Actions',
  url: 'https://gabtun2t.github.io/Gabriel-portfolio/',
  repository: 'https://github.com/gabtun2t/Gabriel-portfolio',
  workflowRuns: 'https://github.com/gabtun2t/Gabriel-portfolio/actions',
  pipeline: 'Every push to main runs the type check, unit tests, data export, SQL parity check and production build. The site is published only if all of them pass.',
  /** Updated by hand only after the live site has been checked. Null until then. */
  lastVerified: null as null | { date: string; commit: string; how: string },
};

export const FEATURE_STATUS: { area: string; feature: string; status: 'Implemented' | 'Partial' | 'Planned'; tested: string; note?: string }[] = [
  { area: 'Site', feature: 'Public deployment on GitHub Pages with automated test-and-build pipeline', status: 'Implemented', tested: 'GitHub Actions run + live check', note: 'See the deployment panel for the build shown here.' },
  { area: 'Site', feature: 'Home, experience, project lab, case studies, architecture, resume & contact, recruiter guide, data dictionary, build status', status: 'Implemented', tested: 'Browser test (desktop + mobile)' },
  { area: 'Site', feature: 'Three recruiter pathways with one-click demos and matching resume download', status: 'Implemented', tested: 'Browser test' },
  { area: 'Site', feature: 'Resume PDF download (AML / financial crime systems track; client names withheld)', status: 'Implemented', tested: 'Browser test (served under the /Gabriel-portfolio/ base path)' },
  { area: 'Site', feature: 'Separate ERP / integration resume track', status: 'Partial', tested: '—', note: 'Pathway links to the current resume until a second verified resume is supplied.' },
  { area: 'Site', feature: 'Contact: email, phone (toggle in profile.ts) and LinkedIn', status: 'Implemented', tested: 'Browser test (link targets)' },
  { area: 'Site', feature: 'Page titles, meta descriptions, Open Graph image, favicon, robots.txt and sitemap', status: 'Implemented', tested: 'Browser test (title + meta)' },
  { area: 'Site', feature: 'Responsive layout, keyboard navigation, focus management, labelled controls, light/dark themes', status: 'Implemented', tested: 'Browser test at 390 px and 1280 px', note: 'No formal WCAG audit performed.' },
  { area: 'AML lab', feature: 'Seeded dataset (40 customers, ~2,400 transactions), 8 documented scenarios', status: 'Implemented', tested: 'Unit tests' },
  { area: 'AML lab', feature: '7 deterministic rules with purpose, condition, observed vs threshold, transactions, legitimate causes and false-positive notes', status: 'Implemented', tested: 'Unit tests + SQL parity' },
  { area: 'AML lab', feature: 'Monitoring dashboard, searchable/filterable/sortable alert queue', status: 'Implemented', tested: 'Browser test' },
  { area: 'AML lab', feature: 'Case view: KYC-related profile, transactions, 8 evidence checks with review checklist, notes', status: 'Implemented', tested: 'Unit tests (evidence) + browser test' },
  { area: 'AML lab', feature: 'Dispositions with validation; closing gated on documentary support', status: 'Implemented', tested: 'Unit tests + browser test' },
  { area: 'AML lab', feature: 'Decisions, notes and checklist persist across reloads; reset clears them', status: 'Implemented', tested: 'Browser test (reload + reset)', note: 'Stored in the visitor’s browser only; not shared.' },
  { area: 'AML lab', feature: 'Case narrative view and .md export (marked SIMULATION)', status: 'Implemented', tested: 'Unit test (content) + browser test (download)' },
  { area: 'AML lab', feature: 'AML methodology reference with Canadian and international context', status: 'Implemented', tested: 'Browser test (renders)', note: 'Educational summary of public guidance; not legal advice.' },
  { area: 'Reconciliation lab', feature: 'Source and target datasets with seeded defects; on-demand run; filters; comparison; lineage; root cause', status: 'Implemented', tested: 'Unit tests + browser test' },
  { area: 'Reconciliation lab', feature: 'Simulated corrections with journal, re-run, and simulation KPIs', status: 'Implemented', tested: 'Unit tests + browser test' },
  { area: 'Reconciliation lab', feature: 'SQL implementation identical to TypeScript', status: 'Implemented', tested: 'scripts/check_sql.py' },
  { area: 'Reconciliation lab', feature: 'Interactive SQL console in the browser', status: 'Planned', tested: '—', note: 'Results shown are real SQLite output captured by the parity script.' },
  { area: 'Payment lab', feature: 'Validation, idempotency, replay, 409 conflict, retries, timeouts, 422, partial batch failure', status: 'Implemented', tested: 'Unit tests + browser test' },
  { area: 'Payment lab', feature: 'Correct vs. incorrect behaviour comparison; audit trail; ERP ↔ bank reconciliation', status: 'Implemented', tested: 'Unit tests + browser test' },
  { area: 'Payment lab', feature: 'mTLS / OAuth / request signing', status: 'Planned', tested: '—', note: 'Described in the security notes; not meaningful in a client-side mock.' },
  { area: 'Data lab', feature: 'Ingest, standardize, validate + quarantine, deduplicate, star schema, metrics, lineage, row-count controls', status: 'Implemented', tested: 'Unit tests + SQL parity + browser test' },
  { area: 'Data lab', feature: 'Incremental loads, SCDs, orchestration, cloud storage', status: 'Planned', tested: '—' },
];

export const KNOWN_LIMITATIONS = [
  'All data is synthetic. Rule thresholds, weights and scenarios are illustrative and not calibrated on real data or regulatory guidance.',
  'The labs are portfolio simulations, not production banking or compliance systems, and have not been reviewed or approved for regulatory use.',
  'Visitor decisions and notes are stored only in that visitor’s browser.',
  'No live SQL console; SQL results are captured from SQLite by the parity script at build time.',
  'The payment lab is a single-process mock with a simulated clock; security controls are documented, not implemented.',
  'The data pipeline is batch and in-memory; there is no orchestration or cloud infrastructure.',
  'Accessibility basics are implemented and browser-tested; no formal WCAG audit has been performed.',
  'The UI type check (npm run typecheck:all) needs @types/react and runs only where npm can install it.',
];
