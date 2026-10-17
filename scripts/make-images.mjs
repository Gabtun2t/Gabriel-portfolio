// Renders public/og-image.png (1200×630) and public/apple-touch-icon.png from local HTML/SVG. Run: node scripts/make-images.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(readFileSync(join(root, 'scripts/assets/og.html'), 'utf8'));
await p.screenshot({ path: join(root, 'public/og-image.png') });
const i = await b.newPage({ viewport: { width: 180, height: 180 } });
await i.setContent(`<body style="margin:0">${readFileSync(join(root, 'public/favicon.svg'), 'utf8').replace('<svg ', '<svg width="180" height="180" ')}</body>`);
await i.screenshot({ path: join(root, 'public/apple-touch-icon.png') });
await b.close();
console.log('Wrote public/og-image.png and public/apple-touch-icon.png');
