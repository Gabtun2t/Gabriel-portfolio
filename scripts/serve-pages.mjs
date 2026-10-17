// Serves dist/ at http://localhost:4174/Gabriel-portfolio/ — the same base path as GitHub Pages.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const root = join(import.meta.dirname, '..', 'dist');
const BASE = '/Gabriel-portfolio/';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.pdf': 'application/pdf', '.csv': 'text/csv', '.sql': 'text/plain', '.txt': 'text/plain', '.xml': 'application/xml', '.json': 'application/json' };
createServer(async (req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (!url.startsWith(BASE)) { res.writeHead(404).end('Not under base path'); return; }
  const rel = normalize(url.slice(BASE.length) || 'index.html').replace(/^(\.\.[/\\])+/, '');
  try {
    const body = await readFile(join(root, rel.endsWith('/') || rel === '.' ? 'index.html' : rel));
    res.writeHead(200, { 'Content-Type': types[extname(rel)] ?? 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(4174, () => console.log(`Serving dist/ at http://localhost:4174${BASE}`));
