/**
 * Browser smoke test (Playwright). Visits every route, exercises the core lab flows,
 * fails on any console error, page error, broken link target or failed asset request.
 *
 *   npm run build && npm run preview &   (serves dist/ on :4173)
 *   npm run test:e2e
 *
 * BASE_URL overrides the target; SCREENSHOTS=dir saves screenshots.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const SHOTS = process.env.SCREENSHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const launch = { headless: true };
if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;

const browser = await chromium.launch(launch);
const failures = [];
const ok = (name) => console.log(`PASS ${name}`);
const fail = (name, err) => { failures.push(name); console.log(`FAIL ${name}: ${err}`); };

async function newPage(viewport) {
  const page = await browser.newPage({ viewport });
  // Resource-load errors are reported (with URL) by the requestfailed/response handlers below, which ignore web fonts.
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) { failures.push(`console: ${m.text()}`); console.log(`FAIL console error: ${m.text()} @ ${page.url()}`); } });
  page.on('pageerror', (e) => { failures.push(`pageerror: ${e.message}`); console.log(`FAIL page error: ${e.message}`); });
  page.on('requestfailed', (r) => { if (!r.url().includes('fonts.g')) { failures.push(`request: ${r.url()}`); console.log(`FAIL request ${r.url()}`); } });
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('fonts.g')) { failures.push(`http ${r.status()} ${r.url()}`); console.log(`FAIL http ${r.status()} ${r.url()}`); } });
  return page;
}

const step = async (name, fn) => { try { await fn(); ok(name); } catch (e) { fail(name, e.message.split('\n')[0]); } };

for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const page = await newPage(viewport);
  const shot = async (n) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${label}-${n}.png`, fullPage: false }); };

  const routes = ['/', '/erp', '/aml', '/experience', '/labs', '/labs/aml', '/labs/reconciliation', '/labs/payments', '/labs/data', '/case-studies', '/architecture', '/contact', '/guide', '/data-dictionary', '/status'];
  for (const r of routes) {
    await step(`[${label}] route ${r} renders`, async () => {
      await page.goto(`${BASE}#${r}`);
      await page.waitForSelector('main h1', { timeout: 5000 });
      const h1 = await page.textContent('main h1');
      if (!h1 || /not found/i.test(h1)) throw new Error(`bad h1: ${h1}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 2) throw new Error(`horizontal overflow ${overflow}px`);
      await shot(r === '/' ? 'home' : r.replace(/\//g, '_'));
    });
  }

  if (label === 'desktop') {
    await step('all internal links resolve to a route', async () => {
      const bad = [];
      for (const r of routes) {
        await page.goto(`${BASE}#${r}`);
        await page.waitForSelector('main h1');
        const hrefs = await page.$$eval('a[href^="#/"]', (as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
        for (const h of hrefs) if (!routes.includes(h.slice(1).split('?')[0])) bad.push(`${r} → ${h}`);
      }
      if (bad.length) throw new Error(bad.join(', '));
    });

    await step('resume PDF and data downloads are served', async () => {
      for (const p of ['resume/Gabriel_Olatundun_ERP_Implementation_Resume.pdf', 'resume/Gabriel_Olatundun_AML_Technology_Resume.pdf', 'data/seed_sqlite.sql', 'data/txn.csv', 'data/customer.csv', 'data/legacy_extract.csv']) {
        const res = await page.request.get(BASE + p);
        if (res.status() !== 200) throw new Error(`${p} → ${res.status()}`);
      }
    });

    await step('AML: queue filters and search work', async () => {
      await page.goto(`${BASE}#/labs/aml?tab=queue`);
      await page.waitForSelector('table.data tbody tr');
      const all = await page.$$eval('table.data tbody tr', (r) => r.length);
      await page.selectOption('#band', 'High');
      const high = await page.$$eval('table.data tbody tr', (r) => r.length);
      if (!(high > 0 && high < all)) throw new Error(`high=${high} all=${all}`);
      await page.selectOption('#band', '');
      await page.fill('#q', 'Northgate');
      const one = await page.$$eval('table.data tbody tr', (r) => r.length);
      if (one !== 1) throw new Error(`search rows=${one}`);
    });

    await step('AML: close is blocked for unresolved case; escalation records and exports', async () => {
      await page.goto(`${BASE}#/labs/aml?tab=queue`);
      await page.fill('#q', 'Lindqvist');
      await page.click('table.data tbody tr');
      await page.waitForSelector('text=Why this alert was generated');
      const closeDisabled = await page.isDisabled('input[value="CLOSE_EXPLAINED_EXCEPTION"]');
      if (!closeDisabled) throw new Error('close should be disabled');
      await page.click('button:has-text("Record disposition")');
      await page.waitForSelector('[role="alert"]');
      await page.check('input[value="ESCALATE_TO_COMPLIANCE"]');
      await page.fill('#rationale', 'Repeated cash deposits just under $10,000 across branches, outbound wire, no RFI response; no data issue.');
      await page.locator('.evidence label.check input').first().check();
      await page.click('button:has-text("Record disposition")');
      await page.waitForSelector('text=Teaching note');
      await page.click('button:has-text("View / export narrative")');
      const report = await page.textContent('.report');
      if (!report.startsWith('SIMULATION')) throw new Error('report not marked SIMULATION');
      await shot('aml-narrative');
      await page.click('.modal button:has-text("Close")');
      await page.click('button:has-text("Reopen case")');
    });

    await step('AML: migration-defect case allows close and re-evaluation shows no rule fires', async () => {
      await page.goto(`${BASE}#/labs/aml?tab=queue`);
      await page.fill('#q', 'Northgate');
      await page.click('table.data tbody tr');
      await page.waitForSelector('text=Re-evaluate with evidence-supported data corrections');
      if (await page.isDisabled('input[value="CLOSE_EXPLAINED_EXCEPTION"]')) throw new Error('close should be enabled');
      const t = await page.textContent('main');
      if (!t.includes('no rule fires')) throw new Error('missing re-evaluation result');
      await shot('aml-case');
    });

    await step('Reconciliation: run, inspect, correct all, re-run', async () => {
      await page.goto(`${BASE}#/labs/reconciliation`);
      await page.click('button:has-text("Run reconciliation")');
      await page.waitForSelector('text=Results by status');
      await page.click('table.data tbody tr');
      await page.waitForSelector('text=Source-to-target lineage');
      await page.click('button:has-text("Apply all proposed corrections")');
      await page.waitForSelector('text=Results are stale');
      await page.click('button:has-text("Re-run validation")');
      const txt = await page.textContent('main');
      if (!/176 matched/.test(txt)) throw new Error('expected 176 matched after corrections');
      await shot('recon');
    });

    await step('Payments: timeout with and without idempotency', async () => {
      await page.goto(`${BASE}#/labs/payments`);
      await page.click('button:has-text("Timeout after bank commit")');
      await page.waitForSelector('text=replayed >> visible=true');
      let t = await page.textContent('main');
      if (!t.includes('MATCHED')) throw new Error('safe run should reconcile as MATCHED');
      await page.click('button:has-text("idempotency OFF")');
      await page.waitForSelector('text=DUPLICATE PAYMENT >> visible=true');
      await page.click('button:has-text("Invalid request")');
      await page.waitForSelector('text=VALIDATION FAILED');
      await shot('payments');
    });

    await step('Data lab: toggle currency rule shows unconverted warning; lineage renders', async () => {
      await page.goto(`${BASE}#/labs/data`);
      await page.waitForSelector('text=Validate — rules and quarantine');
      await page.uncheck('input[aria-label="Enable Currency has an FX rate"]');
      await page.waitForSelector('text=without CAD amount');
      await page.check('input[aria-label="Enable Currency has an FX rate"]');
      await page.waitForSelector('text=Lineage tracer');
      await shot('data');
    });

    await step('keyboard: skip link is the first tab stop', async () => {
      const fresh = await newPage(viewport);
      await fresh.goto(`${BASE}#/`);
      await fresh.waitForSelector('main h1');
      await fresh.keyboard.press('Tab');
      const focused = await fresh.evaluate(() => document.activeElement?.textContent);
      await fresh.close();
      if (!/Skip to content/.test(focused ?? '')) throw new Error(`first tab stop: ${focused}`);
    });
    await step('keyboard: route change moves focus to main content', async () => {
      await page.goto(`${BASE}#/`);
      await page.keyboard.press('Tab');
      await page.click('nav a >> text="Experience"');
      await page.waitForSelector('text=Career timeline');
      const id = await page.evaluate(() => document.activeElement?.id);
      if (id !== 'main') throw new Error(`focus on ${id}`);
    });
  } else {
    await step('[mobile] menu toggle opens navigation', async () => {
      await page.goto(`${BASE}#/`);
      await page.click('.nav-toggle');
      await page.click('nav a >> text="Projects"');
      await page.waitForSelector('text=Four working labs');
    });
  }
  await page.close();
}

await browser.close();
console.log(failures.length ? `\n${failures.length} failure(s)` : '\nAll browser checks passed');
process.exit(failures.length ? 1 : 0);
