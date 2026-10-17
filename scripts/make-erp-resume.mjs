// Generates public/resume/Gabriel_Olatundun_ERP_Implementation_Integration_Resume.pdf
// Content: Gabriel's resume (2026) plus facts he confirmed in writing (Oct 2026).
// No client names (Gabriel's decision). Run: node scripts/make-erp-resume.mjs
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = 'public/resume/Gabriel_Olatundun_ERP_Implementation_Integration_Resume.pdf';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const ul = (items) => `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
const role = (title, org, place, dates, items, extra = '') =>
  `<div class="role"><div class="rh"><span><b>${esc(title)}</b> | ${esc(org)} | ${esc(place)}</span><span>${esc(dates)}</span></div>${extra}${items.length ? ul(items) : ''}</div>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: Letter; margin: 0.55in 0.6in; }
body { font-family: Calibri, Carlito, 'Liberation Sans', Arial, sans-serif; font-size: 10.2pt; color: #1b1f24; line-height: 1.32; }
h1 { font-size: 20pt; letter-spacing: 1.5px; text-align: center; margin: 0; }
.sub { text-align: center; font-weight: 700; color: #2b5c9e; font-size: 10.6pt; margin: 3px 0 2px; letter-spacing: .4px; }
.contact { text-align: center; font-size: 9.6pt; margin-bottom: 6px; }
h2 { font-size: 10.8pt; letter-spacing: 1px; color: #2b5c9e; border-bottom: 1.2px solid #2b5c9e; margin: 10px 0 4px; padding-bottom: 1px; }
p { margin: 0 0 3px; }
ul { margin: 2px 0 4px; padding-left: 16px; } li { margin: 0 0 2px; }
.role { margin-bottom: 5px; break-inside: avoid; }
.rh { display: flex; justify-content: space-between; gap: 10px; }
.proj { border-left: 3px solid #2b5c9e; padding: 2px 0 2px 8px; margin: 3px 0 5px; }
.proj .ph { font-weight: 700; }
.kv b { color: #1b1f24; }
.muted { color: #555; font-size: 9.2pt; }
</style></head><body>
<h1>GABRIEL OLATUNDUN</h1>
<div class="sub">ERP IMPLEMENTATION &amp; INTEGRATION | SAGE 300 · SAGE X3 · ACUMATICA</div>
<div class="contact">Ottawa, Ontario, Canada | 902-880-9877 | gabriel.olatundun@gmail.com | linkedin.com/in/tunde-o-tech</div>

<h2>PROFESSIONAL SUMMARY</h2>
<p>ERP and financial systems professional with 9+ years across ERP implementation, integration, data migration and enterprise support. As Implementation Lead at Softcodes International, led an approximately 18-month, phased, estate-wide Sage 300 implementation, coordinating client stakeholders, the development team and a multidisciplinary implementation team from requirements to go-live, and led a Sage 300 implementation for a public-sector water utility. Delivered further Sage X3 and Sage 300 implementations and advisory support. Now resolves complex enterprise ERP production issues at Acumatica using SQL, diagnostic logs and repeatable testing.</p>

<h2>CORE COMPETENCIES</h2>
<p>ERP Implementation Leadership | Requirements &amp; Process Analysis | Sage 300 &amp; Sage X3 Configuration | Data Migration, Validation &amp; Reconciliation | Functional Testing &amp; UAT | Integration Delivery Coordination | User Training, Phased Deployment &amp; Go-Live | ERP Upgrades | Production Troubleshooting | Stakeholder Communication</p>

<h2>TECHNICAL SKILLS</h2>
<p class="kv"><b>ERP systems:</b> Sage 300, Sage X3 (V11/V12), Acumatica; General Ledger, Accounts Payable, Accounts Receivable, Fixed Assets, distribution and commerce processes</p>
<p class="kv"><b>Data &amp; analysis:</b> SQL Server, Microsoft Excel, data validation, source-to-target mapping, reconciliation, migration testing, Crystal Reports, Sage Enterprise Intelligence</p>
<p class="kv"><b>Integrations:</b> ERP interfaces, bank payment API / Sage 300 integration collaboration, data-flow troubleshooting, configuration validation, transactional test scenarios</p>
<p class="kv"><b>Delivery &amp; documentation:</b> Jira, Smartsheet, functional specifications, UAT, user training, case and defect documentation, knowledge-base content</p>

<h2>PROFESSIONAL EXPERIENCE</h2>
${role('Senior Support Engineer', 'Acumatica Canada Inc.', 'Canada', 'Apr 2026 – Present', [
  'Investigate complex ERP production issues involving financial transactions, commerce, configuration and external integrations; use SQL, diagnostic logs and repeatable testing to distinguish data, process and system defects.',
  'Analyze expected versus actual transaction behaviour and trace interdependent workflows to isolate anomalies, document evidence, and recommend supported corrective actions or engineering escalations.',
  'Coordinate with Product, Engineering, Professional Services and Consulting on high-impact cases; communicate risks, business impact, technical constraints and resolution progress to customers and partners.',
  'Prepare case documentation and reusable troubleshooting guidance; mentor support colleagues on complex problem analysis.',
])}
${role('Product Support Specialist', 'Acumatica Canada Inc.', 'Canada', 'Jul 2023 – Mar 2026', [
  'Supported enterprise finance, inventory, distribution and related transactional workflows, reproducing complex behaviour and assessing process and data impacts.',
  'Reviewed system configuration, test results and case evidence; worked with engineering and consulting teams to resolve issues and improve supportability.',
])}
${role('Finance Analyst (Sage X3)', 'Panni Management & Technology', 'Remote, Canada', 'Jun 2022 – Jul 2023', [
  'Analyzed financial business requirements and supported Sage X3 configurations for GL, AP, AR and Fixed Assets during ERP implementations.',
  'Worked across Sage X3 financial processes, including GL, AP, AR and financial reporting, validating configuration and resolving financial data issues.',
  'Mapped, validated and reconciled migrated financial and operational records; investigated mismatches and supported correction of data-quality exceptions.',
  'Performed functional testing and UAT for financial transaction flows, documented issues, and supported post-go-live user troubleshooting.',
])}
${role('Senior Technical Consultant', 'Softcodes International Ltd.', 'Lagos, Nigeria', 'Oct 2016 – Dec 2021', [
  'Delivered Sage X3 and Sage 300 implementations and advisory support across finance, manufacturing, distribution and other enterprise environments, translating client requirements into workable system processes.',
  'Partnered with an internal developer and client stakeholders to integrate a bank payment API with Sage 300 for a financial-services client; helped align payment processing with ERP and finance workflows.',
  'Supported Sage X3 integrations with investment and payroll applications, resolving data mapping, interface and process issues through cross-functional investigation.',
  'Led or supported data migration, validation, reconciliation, functional testing, user acceptance, upgrade delivery (Sage X3 V11 to V12) and post-implementation troubleshooting.',
], `<div class="proj"><div class="ph">Implementation Lead, Sage 300: estate management organisation, Lagos (approx. 18 months, phased, estate-wide)</div>
<p>Led the implementation across its full lifecycle for estate-wide financial operations, including estate dues, billing, collections and property-related financial transactions.</p>
${ul([
  'Led business requirements gathering and process analysis; directed Sage 300 configuration and implementation activities.',
  'Oversaw data migration, testing and validation.',
  'Coordinated delivery of a custom integration with the client’s existing estate management software, developed by the Softcodes team.',
  'Coordinated the client’s stakeholders, the development team and a multidisciplinary implementation team; coordinated user training, phased deployment and go-live.',
])}</div>
<div class="proj"><div class="ph">Implementation Lead, Sage 300: public-sector water utility (government project)</div></div>`)}

<h2>EARLIER EXPERIENCE</h2>
<p><b>Software Intern</b> | Sage Software West Africa | Nigeria | Jun 2016 – Sep 2016: structured training in Sage accounting, business-management software, ERP configurations and support.</p>
<p><b>IT Consultant</b> | MDS Logistics | Lagos, Nigeria | Mar 2015 – Oct 2015: supported logistics enterprise applications, data validation, documentation, and inventory / order-processing workflows.</p>

<h2>EDUCATION</h2>
<p>Master of Technology Entrepreneurship and Innovation (MTEI) | Saint Mary’s University, Halifax, NS | 2022–2023</p>
<p>Bachelor of Technology, Computer Engineering | Ladoke Akintola University of Technology, Nigeria | 2008–2014</p>

<h2>CERTIFICATIONS &amp; PRODUCT BADGES</h2>
<p>Sage X3 Certified Technical Consultant | Sage X3 Certified Financial Consultant | Sage X3 Certified Distribution Consultant | Sage CRM Certification | Sage X3 Project Management Training | Acumatica Finance, Distribution, Manufacturing &amp; Commerce Product Badges</p>
</body></html>`;

mkdirSync('public/resume', { recursive: true });
writeFileSync('test-results/erp-resume.html', html);
const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const p = await b.newPage();
await p.setContent(html, { waitUntil: 'load' });
await p.pdf({ path: OUT, format: 'Letter', printBackground: true });
await b.close();
console.log('wrote', OUT);
