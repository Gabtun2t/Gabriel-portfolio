/**
 * Release QA (Playwright): the 20 checks from the production brief, run against a served build.
 * Serve the build under the same base path as GitHub Pages to catch path bugs:
 *
 *   npm run build && npm run preview:pages &     (http://localhost:4174/Gabriel-portfolio/)
 *   BASE_URL=http://localhost:4174/Gabriel-portfolio/ npm run test:release
 */
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:4174/Gabriel-portfolio/';
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const results = [];
const errors = [];

async function page(viewport = { width: 1280, height: 900 }) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`pageerror ${e.message} @ ${p.url()}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`console ${m.text()} @ ${p.url()}`); });
  p.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('fonts.g')) errors.push(`http ${r.status()} ${r.url()}`); });
  return p;
}
async function check(n, name, fn) {
  try { const detail = await fn(); results.push({ n, name, ok: true, detail: detail ?? '' }); console.log(`PASS ${n}. ${name}${detail ? ` — ${detail}` : ''}`); }
  catch (e) { results.push({ n, name, ok: false, detail: e.message.split('\n')[0] }); console.log(`FAIL ${n}. ${name}: ${e.message.split('\n')[0]}`); if (process.env.GITHUB_ACTIONS) console.log(`::error title=Release QA ${n}::${name}: ${e.message.split('\n')[0].replace(/[\r\n%]/g, ' ')}`); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };
const go = async (p, route) => { await p.goto(`${BASE}#${route}`); await p.waitForSelector('main h1'); };

const p = await page();

await check(1, 'Homepage navigation', async () => {
  await go(p, '/');
  const h1 = await p.textContent('main h1');
  assert(h1.includes('Gabriel Olatundun'), `h1: ${h1}`);
  assert((await p.textContent('.hero-title')).includes('Senior ERP Implementation & Financial Systems Specialist'), 'hero title');
  for (const [label, expect] of [['Experience', 'Career timeline'], ['Projects', 'Four working labs'], ['ERP', 'ERP implementation & financial systems'], ['AML Technology', 'AML compliance & financial crime experience'], ['Resumes & Contact', 'Get in touch'], ['Home', 'Gabriel Olatundun']]) {
    await p.click(`nav a >> text="${label}"`);
    await p.waitForFunction((t) => document.querySelector('main h1')?.textContent?.includes(t), expect);
  }
  const title = await p.title();
  const desc = await p.getAttribute('meta[name="description"]', 'content');
  assert(title.includes('Gabriel Olatundun') && desc.length > 40, 'title/meta');
  return `6 nav links; title "${title}"`;
});

await check(2, 'Recruiter pathways open the right demo and resume', async () => {
  const targets = [['View ERP experience', 'ERP implementation & financial systems'], ['Explore AML technology', 'AML compliance & financial crime experience'], ['AML lab', 'AML transaction monitoring'], ['View project', 'AML transaction monitoring']];
  for (const [cta, h1] of targets) {
    await go(p, '/');
    await p.click(`main a >> text="${cta}"`);
    await p.waitForFunction((t) => document.querySelector('main h1')?.textContent?.includes(t), h1);
  }
  await go(p, '/');
  const hrefs = await p.$$eval('.track-card a[download]', (as) => as.map((a) => a.getAttribute('href')));
  assert(hrefs.length === 2 && new Set(hrefs).size === 2, `track resume links ${hrefs.length}`);
  for (const h of new Set(hrefs)) assert((await p.request.get(BASE + h)).status() === 200, `${h} not 200`);
  await go(p, '/experience?section=erp-implementation');
  await p.waitForFunction(() => location.hash.startsWith('#/erp'));
  const exp = await p.textContent('main');
  for (const t of ['ERP implementation & financial systems', 'Capability areas', 'Production troubleshooting', 'Sage X3 (V11 / V12)', 'Industry experience', 'Manufacturing', 'Water utilities', 'Food services', 'Logistics', 'Sage 300 ERP Implementation Lead', 'Approximately 18 months', 'Real estate & estate management', 'Investment holding', 'downstream oil and gas', 'public-sector water utility']) assert(exp.includes(t), `experience missing ${t}`);
  assert(exp.includes('Estate management organisation, Lagos'), 'led engagement must show the anonymised client description');
  await go(p, '/case-studies?study=erp');
  assert((await p.textContent('#cs-erp')).includes('Professional experience · anonymised'), 'ERP case study label');
  assert(!exp.includes('Selected client organisations'), 'client list shown although no names are approved');
  for (const t of ['Featured project · led implementation', 'Types of ERP work', 'Project examples are anonymised', 'developed by the Softcodes team']) assert(exp.includes(t), `experience missing ${t}`);
  assert(!/confidential/i.test(exp), 'blanket confidentiality wording should be replaced');
  assert(!/Led the Sage 300 implementation for a public-sector|led or supported a Sage X3|upgrade \(led or supported\)/i.test(exp), 'unconfirmed leadership wording present');
  assert(exp.includes('Participated as a consultant in a Sage X3 V11 to V12 upgrade'), 'upgrade role wording');
  await go(p, '/');
  const home = await p.textContent('main');
  for (const t of ['Three reasons to interview Gabriel', 'Choose your career track', 'Featured technical work', 'Implementation Lead', 'Kibana (since 2025)', 'ERP & Financial Systems (PDF)', 'AML & Financial Crime (PDF)', 'ERP Implementation & Integration resume (PDF)', 'AML Compliance & Financial Crime resume (PDF)']) assert(home.includes(t), `home missing ${t}`);
  assert(!/Live from the AML lab|One thread|Signature story/.test(home), 'technical sections should not be on the homepage');
  const heroDl = await p.$$eval('.hero-home a[download]', (as) => as.map((a) => a.getAttribute('href')));
  assert(new Set(heroDl).size === 2, 'hero must offer two different resumes');
  const sizes = [];
  for (const h of heroDl) { const r = await p.request.get(BASE + h); assert(r.status() === 200 && (await r.body()).subarray(0, 4).toString() === '%PDF', `${h} not a PDF`); sizes.push((await r.body()).length); }
  assert(sizes[0] !== sizes[1], 'ERP resume must be a separate document');
  await go(p, '/guide');
  const guideDl = await p.$$eval('[aria-label="Resumes"] a[download]', (as) => as.map((a) => a.textContent + '|' + a.getAttribute('href')));
  assert(guideDl.length === 2 && guideDl.some((x) => x.startsWith('ERP Implementation')) && guideDl.some((x) => x.startsWith('AML')), 'recruiter guide must offer both labelled resumes');
  for (const x of guideDl) assert((await p.request.get(BASE + x.split('|')[1])).status() === 200, `${x} not 200`);
  return 'hero CTAs and track cards reach ERP, AML and labs; two separate resumes; ERP page complete; old deep link redirects';
});

await check(3, 'AML alert queue: search, filter, sort', async () => {
  await go(p, '/labs/aml?tab=queue');
  const n = async () => p.$$eval('table.data tbody tr', (r) => r.length);
  const all = await n();
  await p.selectOption('#band', 'High'); const high = await n();
  await p.selectOption('#band', ''); await p.selectOption('#cat', 'Data quality'); const dq = await n();
  await p.selectOption('#cat', ''); await p.fill('#q', 'CASE-260103'); const one = await n();
  await p.fill('#q', '');
  await p.click('th button:has-text("Score")');
  const first = await p.textContent('table.data tbody tr td');
  assert(all === 8 && high === 2 && dq === 1 && one === 1, `all ${all} high ${high} dq ${dq} one ${one}`);
  return `8 alerts; High=2; Data quality=1; search=1; sorted (first ${first.trim()})`;
});

await check(4, 'AML case selection and deep-link refresh', async () => {
  const fresh = await page();
  await fresh.goto(`${BASE}#/labs/aml?tab=case&case=CASE-260103`);
  await fresh.waitForSelector('text=Why this alert was generated');
  const t = await fresh.textContent('main');
  assert(t.includes('Northgate Agri Supplies') && t.includes('Scenario A'), 'case content');
  await fresh.reload(); await fresh.waitForSelector('text=Why this alert was generated');
  await fresh.context().close();
  return 'direct load + reload of a case URL';
});

await check(5, 'Evidence review checklist persists', async () => {
  await go(p, '/labs/aml?tab=case&case=CASE-260107');
  await p.waitForSelector('text=Evidence review checklist');
  const boxes = p.locator('.evidence label.check input');
  await boxes.nth(0).check(); await boxes.nth(1).check();
  await p.waitForSelector('text=2 of 8 reviewed');
  await p.reload(); await p.waitForSelector('text=2 of 8 reviewed');
  return '2 of 8 ticked, survived reload';
});

await check(6, 'Disposition validation', async () => {
  await go(p, '/labs/aml?tab=case&case=CASE-260107');
  assert(await p.isDisabled('input[value="CLOSE_EXPLAINED_EXCEPTION"]'), 'close should be disabled for Scenario B');
  await p.check('input[value="ESCALATE_TO_COMPLIANCE"]');
  await p.fill('#rationale', 'too short');
  await p.click('button:has-text("Record disposition")');
  const err = await p.textContent('[role="alert"]');
  assert(/at least 40 characters/.test(err), `error: ${err}`);
  await go(p, '/labs/aml?tab=case&case=CASE-260103');
  assert(!(await p.isDisabled('input[value="CLOSE_EXPLAINED_EXCEPTION"]')), 'close should be enabled for Scenario A');
  return 'close blocked for B, allowed for A; short rationale rejected';
});

await check(7, 'Decision persistence and reset', async () => {
  await go(p, '/labs/aml?tab=case&case=CASE-260107');
  await p.check('input[value="ESCALATE_TO_COMPLIANCE"]');
  await p.fill('#rationale', 'Four cash deposits just under $10,000 across three branches, a $37,000 wire out, no RFI response, and no data defect.');
  await p.fill('#note', 'Counterparty Ridgeback Auto Brokers has no prior history.');
  await p.click('button:has-text("Add note")');
  await p.click('button:has-text("Record disposition")');
  await p.waitForSelector('text=Teaching note');
  await p.reload(); await p.waitForSelector('text=Teaching note');
  await go(p, '/labs/aml?tab=queue');
  const row = await p.textContent('table.data tbody tr:has-text("CASE-260107")');
  assert(row.includes('Escalate to compliance'), 'queue status after reload');
  return 'escalation + note survived reload; queue shows status';
});

await check(8, 'Narrative export contains evidence and disposition', async () => {
  await go(p, '/labs/aml?tab=case&case=CASE-260107');
  await p.click('button:has-text("View / export narrative")');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Download .md")')]);
  const text = readFileSync(await dl.path(), 'utf8');
  for (const s of ['SIMULATION — SYNTHETIC DATA', 'CASE-260107', 'Escalate to compliance', 'Repeated cash just below $10,000', '[reviewed]', 'Ridgeback Auto Brokers has no prior history', 'no response']) assert(text.includes(s), `missing "${s}"`);
  await p.click('.modal button:has-text("Close")');
  // Reset clears everything
  await go(p, '/labs/aml?tab=overview');
  await p.click('button:has-text("Reset my decisions")');
  await go(p, '/labs/aml?tab=queue');
  const row = await p.textContent('table.data tbody tr:has-text("CASE-260107")');
  assert(row.includes('Open'), 'reset did not reopen');
  return `${dl.suggestedFilename()} verified; reset reopened the case`;
});

await check(9, 'Reconciliation execution', async () => {
  await go(p, '/labs/reconciliation');
  await p.click('button:has-text("Run reconciliation")');
  await p.waitForSelector('text=Results by status');
  const t = await p.textContent('main');
  assert(t.includes('Exceptions (24)') && t.includes('Initial match rate'), 'counts');
  return '24 exceptions on the original ledger';
});

await check(10, 'Simulated corrections are journalled', async () => {
  await p.click('button:has-text("Apply all proposed corrections")');
  await p.waitForSelector('text=Correction journal >> visible=true');
  const rows = await p.$$eval('h3:has-text("Correction journal") ~ .table-wrap tbody tr', (r) => r.length);
  assert(rows === 22, `journal rows ${rows}`);
  return '22 journal entries';
});

await check(11, 'Reconciliation re-run and AML deep link', async () => {
  await p.click('button:has-text("Re-run validation")');
  const t = await p.textContent('main');
  assert(/176 matched, 2 exception/.test(t), 'rerun result');
  const fresh = await page();
  await go(fresh, '/labs/reconciliation?ref=RCPT-55821');
  await fresh.waitForSelector('text=Decimal scale shift');
  await fresh.context().close();
  return '176 matched, 2 for review; ?ref=RCPT-55821 opens the decimal-shift row';
});

await check(12, 'Payment failure scenarios', async () => {
  await go(p, '/labs/payments');
  for (const [btn, expect] of [['Bank 503 twice, then success', 'CONFIRMED'], ['Insufficient funds (422)', 'REJECTED'], ['Invalid request (schema)', 'VALIDATION FAILED'], ['Batch with a partial failure', 'NOT EXPECTED AT BANK']]) {
    await p.click(`button:has-text("${btn}")`);
    await p.waitForSelector(`text=${expect}`);
  }
  return '503 retry, 422, schema, partial batch';
});

await check(13, 'Idempotency behaviour', async () => {
  await p.click('button:has-text("Timeout after bank commit")');
  await p.waitForSelector('.badge:has-text("replayed") >> visible=true');
  await p.click('button:has-text("idempotency OFF")');
  await p.waitForSelector('td >> text=DUPLICATE PAYMENT >> visible=true');
  await p.click('button:has-text("Edited after sending")');
  await p.waitForSelector('text=CONFLICT >> visible=true');
  const t = await p.textContent('main');
  assert(t.includes('Correct vs. incorrect integration behaviour'), 'comparison');
  return 'replay, duplicate without key, 409 conflict';
});

await check(14, 'Data pipeline execution and controls', async () => {
  await go(p, '/labs/data');
  const balanced = await p.$$eval('td .badge', (b) => b.filter((x) => x.textContent === 'Balanced').length);
  await p.uncheck('input[aria-label="Enable Currency has an FX rate"]');
  await p.waitForSelector('text=without CAD amount');
  await p.check('input[aria-label="Enable Currency has an FX rate"]');
  assert(balanced === 3, `balanced ${balanced}`);
  return '3 of 3 sources balanced; rule toggle re-runs';
});

await check(15, 'Data lineage', async () => {
  const first = await p.$eval('#tk', (s) => s.value);
  const nodes = await p.$$eval('.trace .node', (n) => n.map((x) => x.textContent));
  assert(nodes.some((x) => x.startsWith('RAW-')) && nodes.some((x) => x.startsWith(first)), 'trace nodes');
  return `${first} traced to ${nodes.filter((x) => x.startsWith('RAW-')).length} raw deliveries`;
});

await check(16, 'Resume downloads', async () => {
  await go(p, '/contact');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('a:has-text("Download PDF")')]);
  const buf = readFileSync(await dl.path());
  assert(buf.subarray(0, 4).toString() === '%PDF', 'not a PDF');
  return `${dl.suggestedFilename()} (${Math.round(buf.length / 1024)} KB)`;
});

await check(17, 'External links (targets only; not fetched)', async () => {
  await go(p, '/contact');
  const li = await p.getAttribute('a[href^="https://www.linkedin.com"]', 'href');
  const rel = await p.getAttribute('a[href^="https://www.linkedin.com"]', 'rel');
  const mail = await p.getAttribute('a[href^="mailto:"]', 'href');
  assert(li === 'https://www.linkedin.com/in/tunde-o-tech' && rel.includes('noopener') && mail.startsWith('mailto:gabriel.olatundun@gmail.com'), 'links');
  await go(p, '/labs/aml?tab=method');
  const refs = await p.$$eval('a[href^="https://fintrac-canafe"], a[href^="https://www.fatf-gafi"]', (a) => a.length);
  assert(refs >= 5, `regulatory links ${refs}`);
  return `LinkedIn, mailto, ${refs} regulatory references`;
});

await check(18, 'Mobile layout (390 px): no horizontal overflow on any route; menu works', async () => {
  const m = await page({ width: 390, height: 844 });
  const routes = ['/', '/erp', '/aml', '/experience', '/labs', '/labs/aml', '/labs/aml?tab=case&case=CASE-260108', '/labs/aml?tab=method', '/labs/reconciliation', '/labs/payments', '/labs/data', '/case-studies', '/architecture', '/contact', '/guide', '/data-dictionary', '/status'];
  for (const r of routes) {
    await go(m, r);
    const over = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(over <= 2, `${r} overflows ${over}px`);
  }
  await go(m, '/'); await m.click('.nav-toggle'); await m.click('nav a >> text="ERP"');
  await m.waitForSelector('text=ERP implementation & financial systems');
  await m.context().close();
  return `${routes.length} routes`;
});

await check(19, 'Keyboard accessibility', async () => {
  const k = await page();
  await go(k, '/');
  await k.keyboard.press('Tab');
  assert(/Skip to content/.test(await k.evaluate(() => document.activeElement?.textContent)), 'skip link not first');
  await go(k, '/labs/aml');
  await k.focus('[role="tab"][aria-selected="true"]');
  await k.keyboard.press('ArrowRight');
  const sel = await k.$eval('[role="tab"][aria-selected="true"]', (e) => e.textContent);
  assert(sel === 'Alert queue', `arrow key tab: ${sel}`);
  const unlabeled = await k.$$eval('input, select, textarea', (els) => els.filter((e) => !e.id || !document.querySelector(`label[for="${e.id}"]`)).filter((e) => !e.getAttribute('aria-label') && !e.closest('label')).length);
  assert(unlabeled === 0, `${unlabeled} unlabeled controls`);
  await k.context().close();
  return 'skip link, arrow-key tabs, all controls labelled';
});

await check(20, 'Production build assets under the base path', async () => {
  await go(p, '/');
  const og = await p.getAttribute('meta[property="og:image"]', 'content');
  const commit = await p.getAttribute('meta[name="build-commit"]', 'content');
  for (const a of ['og-image.png', 'favicon.svg', 'apple-touch-icon.png', 'robots.txt', 'sitemap.xml', 'data/seed_sqlite.sql']) assert((await p.request.get(BASE + a)).status() === 200, `${a} missing`);
  return `build ${commit}; og:image ${og.split('/').pop()}`;
});

if (errors.length) results.push({ n: 0, name: 'No console/page/HTTP errors', ok: false, detail: errors.slice(0, 5).join(' | ') });
else results.push({ n: 0, name: 'No console/page/HTTP errors', ok: true, detail: '' });
await browser.close();
mkdirSync('test-results', { recursive: true });
writeFileSync('test-results/release-qa.json', JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 1));
const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `\n${failed.length} check(s) failed${errors.length ? `; errors: ${errors.join(' | ')}` : ''}` : `\nAll ${results.length} release checks passed`);
process.exit(failed.length ? 1 : 0);
