/**
 * Build / dev server using esbuild (single dependency, no config).
 *
 *   node scripts/build.mjs           → production build into dist/
 *   node scripts/build.mjs --serve   → dev server on http://localhost:5173 with rebuild on change
 *   node scripts/build.mjs --single  → also writes dist-single/index.html with JS+CSS inlined
 *
 * Imports ending in "?raw" are bundled as plain text, which lets the site display the exact
 * source code of the rules and tests that run in the page.
 */
import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const serve = args.has('--serve');
const outdir = join(root, 'dist');

const rawPlugin = {
  name: 'raw',
  setup(build) {
    build.onResolve({ filter: /\?raw$/ }, (a) => ({ path: resolve(a.resolveDir, a.path.replace(/\?raw$/, '')), namespace: 'raw' }));
    build.onLoad({ filter: /.*/, namespace: 'raw' }, (a) => ({ contents: readFileSync(a.path, 'utf8'), loader: 'text', watchFiles: [a.path] }));
  },
};

const options = {
  entryPoints: [join(root, 'src', 'main.tsx')],
  bundle: true,
  outdir: join(outdir, 'assets'),
  entryNames: serve ? 'app' : 'app-[hash]',
  format: 'esm',
  target: ['es2020', 'chrome100', 'safari15', 'firefox100'],
  jsx: 'automatic',
  minify: !serve,
  sourcemap: serve ? 'inline' : false,
  metafile: true,
  plugins: [rawPlugin],
  define: { 'process.env.NODE_ENV': JSON.stringify(serve ? 'development' : 'production') },
  logLevel: 'info',
};

function writeHtml(metafile) {
  const outputs = Object.keys(metafile.outputs).map((p) => p.replace(/\\/g, '/'));
  const js = outputs.find((p) => p.endsWith('.js')).split('/dist/')[1] ?? outputs.find((p) => p.endsWith('.js')).replace(/^dist\//, '');
  const cssOut = outputs.find((p) => p.endsWith('.css'));
  const css = cssOut ? (cssOut.split('/dist/')[1] ?? cssOut.replace(/^dist\//, '')) : null;
  let html = readFileSync(join(root, 'index.html'), 'utf8');
  html = html.replace('<!--CSS-->', css ? `<link rel="stylesheet" href="./${css}">` : '').replace('<!--JS-->', `<script type="module" src="./${js}"></script>`);
  writeFileSync(join(outdir, 'index.html'), html);
  return { js, css };
}

function copyPublic() {
  if (existsSync(join(root, 'public'))) cpSync(join(root, 'public'), outdir, { recursive: true });
}

if (serve) {
  rmSync(outdir, { recursive: true, force: true });
  mkdirSync(outdir, { recursive: true });
  copyPublic();
  const ctx = await esbuild.context({ ...options, plugins: [...options.plugins, { name: 'html', setup(b) { b.onEnd((r) => r.metafile && writeHtml(r.metafile)); } }] });
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: outdir, port: 5173 });
  console.log(`Dev server: http://localhost:${port}`);
} else {
  rmSync(outdir, { recursive: true, force: true });
  mkdirSync(outdir, { recursive: true });
  copyPublic();
  const result = await esbuild.build(options);
  const { js, css } = writeHtml(result.metafile);
  if (args.has('--single')) {
    // Single-file variant (JS + CSS inlined) for previews that cannot serve multiple files.
    const single = join(root, 'dist-single');
    rmSync(single, { recursive: true, force: true });
    mkdirSync(single, { recursive: true });
    let html = readFileSync(join(root, 'index.html'), 'utf8');
    const jsText = readFileSync(join(outdir, js), 'utf8').replace(/<\/script/gi, '<\\/script');
    const cssText = css ? readFileSync(join(outdir, css), 'utf8') : '';
    html = html.replace('<!--CSS-->', `<style>${cssText}</style>`).replace('<!--JS-->', `<script type="module">${jsText}</script>`);
    writeFileSync(join(single, 'index.html'), html);
    console.log('Wrote dist-single/index.html');
  }
  console.log('Build complete → dist/');
}
