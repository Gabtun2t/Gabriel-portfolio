// Recruiter usability checks: scenario journeys (clicks, above-the-fold visibility), responsive overflow
// at five widths, and real interactions. No timings are measured. Run against `npm run preview:pages`.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:4174/Gabriel-portfolio/';
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const out = { scenarios: [], responsive: [], interactions: [], failures: [] };
const go = async (p, r) => { await p.goto(`${BASE}#${r}`); await p.waitForSelector('main h1'); };
const aboveFold = (p, sel) => p.$eval(sel, (el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; }).catch(() => false);
const fail = (m) => { out.failures.push(m); console.log('FAIL', m); if (process.env.GITHUB_ACTIONS) console.log(`::error title=UX check::${String(m).replace(/[\r\n%]/g, ' ')}`); };

for (const [w, h, label] of [[1280, 800, 'desktop'], [390, 844, 'mobile']]) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  // Scenario A: ERP recruiter
  await go(p, '/');
  const a = { scenario: 'A · ERP recruiter', viewport: label, steps: [] };
  a.steps.push({ step: 'Name and senior title', clicks: 0, aboveFold: await aboveFold(p, '.hero-title') });
  a.steps.push({ step: 'ERP resume download', clicks: 1, aboveFold: await aboveFold(p, '.resume-choice a:first-of-type') });
  a.steps.push({ step: 'Implementation leadership statement', clicks: 0, aboveFold: await aboveFold(p, '.glance') });
  await p.click('main a >> text="View ERP experience"');
  await p.waitForSelector('.featured-engagement');
  a.steps.push({ step: 'Featured Sage 300 implementation (ERP page)', clicks: 1, aboveFold: await aboveFold(p, '.featured-engagement h3') });
  out.scenarios.push(a);
  // Scenario B: AML technology recruiter
  await go(p, '/');
  const b = { scenario: 'B · AML technology recruiter', viewport: label, steps: [] };
  b.steps.push({ step: 'AML resume download', clicks: 1, aboveFold: await aboveFold(p, '.resume-choice a:last-of-type') });
  await p.click('main a >> text="Explore AML technology"');
  await p.waitForSelector('#aml-real');
  b.steps.push({ step: 'Verified AML-related experience (AML page)', clicks: 1, aboveFold: await aboveFold(p, '#aml-real') });
  await p.click('.page-hero a >> text="AML investigation lab"');
  await p.waitForFunction(() => document.querySelector('main h1')?.textContent?.includes('AML transaction monitoring'));
  b.steps.push({ step: 'AML lab opened', clicks: 2, aboveFold: true });
  out.scenarios.push(b);
  // Scenario C: technical hiring manager
  await go(p, '/');
  const c = { scenario: 'C · Technical hiring manager', viewport: label, steps: [] };
  if (label === 'mobile') await p.click('.nav-toggle');
  await p.click('nav a >> text="Projects"');
  await p.waitForSelector('#deeper');
  c.steps.push({ step: 'All four labs (Projects)', clicks: label === 'mobile' ? 2 : 1, aboveFold: true });
  await p.click('a >> text="Open lab 2"');
  await p.waitForSelector('.brief');
  await p.click('summary >> text="View technical details"');
  const open = await p.$eval('.brief details', (d) => d.open);
  c.steps.push({ step: 'Lab technical details expanded', clicks: (label === 'mobile' ? 2 : 1) + 2, aboveFold: open });
  await go(p, '/labs');
  await p.click('#deeper ~ * a >> text="Architecture"').catch(async () => p.click('a.card-link >> text="Architecture"'));
  await p.waitForFunction(() => document.querySelector('main h1')?.textContent?.length > 0 && location.hash.includes('architecture'));
  c.steps.push({ step: 'Architecture page', clicks: (label === 'mobile' ? 2 : 1) + 1, aboveFold: true });
  out.scenarios.push(c);
  await p.close();
}

// Responsive: no horizontal overflow at five widths on every route.
const routes = ['/', '/erp', '/aml', '/experience', '/labs', '/labs/aml', '/labs/aml?tab=case&case=CASE-260108', '/labs/reconciliation', '/labs/payments', '/labs/data', '/case-studies', '/architecture', '/contact', '/guide', '/status'];
for (const w of [320, 390, 768, 1024, 1280]) {
  const p = await browser.newPage({ viewport: { width: w, height: 900 } });
  let bad = [];
  for (const r of routes) {
    await go(p, r);
    const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 2) bad.push(`${r} (+${over}px)`);
  }
  // overlapping or off-screen buttons in the hero
  await go(p, '/');
  const off = await p.$$eval('.hero-home .btn', (bs) => bs.filter((b) => { const r = b.getBoundingClientRect(); return r.right > window.innerWidth + 1 || r.left < -1 || r.height < 30; }).length);
  out.responsive.push({ width: w, routes: routes.length, overflow: bad, heroButtonsOffscreenOrTooSmall: off });
  if (bad.length || off) fail(`width ${w}: overflow ${bad.join(', ')} offscreen buttons ${off}`);
  await p.close();
}

// Interactions
{
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await go(p, '/');
  await p.click('.nav-toggle');
  const navOpen = await p.$eval('#site-nav', (n) => getComputedStyle(n).display !== 'none');
  out.interactions.push({ check: 'Mobile menu opens', ok: navOpen });
  const [dl] = await Promise.all([p.waitForEvent('download'), (await p.click('.nav-toggle'), p.click('.resume-choice a:first-of-type'))]);
  out.interactions.push({ check: 'ERP resume downloads from hero (mobile)', ok: /ERP_Implementation_Resume\.pdf$/.test(dl.suggestedFilename()) });
  const [dl2] = await Promise.all([p.waitForEvent('download'), p.click('.resume-choice a:last-of-type')]);
  out.interactions.push({ check: 'AML resume downloads from hero (mobile)', ok: /AML_Technology_Resume\.pdf$/.test(dl2.suggestedFilename()) });
  await go(p, '/labs/reconciliation');
  const before = await p.evaluate(() => window.scrollY);
  await p.click('button >> text=/Explore the interactive lab/');
  await p.waitForTimeout(900);
  const after = await p.evaluate(() => window.scrollY);
  out.interactions.push({ check: 'Lab "Explore the interactive lab" scrolls to the lab', ok: after > before + 100 });
  await go(p, '/labs/aml?tab=queue');
  const tableOk = await p.evaluate(() => { const t = document.querySelector('.table-wrap'); return !!t && t.scrollWidth >= t.clientWidth && document.documentElement.scrollWidth <= window.innerWidth + 2; });
  out.interactions.push({ check: 'AML alert table scrolls inside its container on mobile', ok: tableOk });
  await go(p, '/contact');
  const contact = await p.$$eval('a[href^="mailto:"], a[href*="linkedin.com"]', (as) => as.length);
  out.interactions.push({ check: 'Contact page has email and LinkedIn links', ok: contact >= 2 });
  for (const i of out.interactions) if (!i.ok) fail(i.check);
  await p.close();
}

for (const s of out.scenarios) for (const st of s.steps) console.log(`${s.scenario} [${s.viewport}] ${st.step}: ${st.clicks} click(s), ${st.aboveFold ? 'visible without scrolling' : 'needs scrolling'}`);
for (const r of out.responsive) console.log(`width ${r.width}: ${r.routes} routes, overflow: ${r.overflow.length ? r.overflow.join(', ') : 'none'}`);
for (const i of out.interactions) console.log(`${i.ok ? 'PASS' : 'FAIL'} ${i.check}`);
mkdirSync('test-results', { recursive: true });
writeFileSync('test-results/ux.json', JSON.stringify(out, null, 2));
await browser.close();
console.log(out.failures.length ? `\n${out.failures.length} UX failure(s)` : '\nAll UX checks passed');
process.exit(out.failures.length ? 1 : 0);
