// Builds both resumes as editable DOCX, then converts each to PDF with LibreOffice so the two
// formats match. ATS: single column, standard headings, real Word bullets, no tables, text boxes,
// images or header/footer content.
// Usage: NODE_PATH=/opt/npm-tools/node_modules node scripts/resumes/build.mjs <docx-out-dir>
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { ERP, AML } from './content.mjs';

const require = createRequire(import.meta.url);
const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, TabStopType, LevelFormat } = require('docx');

const DOCX_DIR = resolve(process.argv[2] || 'test-results/resumes');
const PDF_DIR = resolve('public/resume');
const FONT = 'Calibri';
const BLUE = '1F4E8C';
const W = 12240, MARGIN = 820; // Letter, ~0.57in margins
const RIGHT = W - 2 * MARGIN;

const run = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size ?? 21, bold: o.bold, color: o.color, italics: o.italics });
const para = (children, o = {}) => new Paragraph({ children, spacing: { after: o.after ?? 40, before: o.before ?? 0, line: 252 }, alignment: o.align, keepNext: o.keepNext, tabStops: o.tabs, numbering: o.bullet ? { reference: 'bul', level: 0 } : undefined, border: o.border });
const heading = (t) => para([run(t, { bold: true, color: BLUE, size: 21 })], { before: 110, after: 50, keepNext: true, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } } });
const rightTab = [{ type: TabStopType.RIGHT, position: RIGHT }];
const bullet = (t) => para([run(t)], { bullet: true, after: 25 });

function build(r) {
  const out = [
    para([run(r.name, { bold: true, size: 36 })], { align: AlignmentType.CENTER, after: 20 }),
    para([run(r.headline, { bold: true, color: BLUE, size: 20 })], { align: AlignmentType.CENTER, after: 20 }),
    para([run(r.line, { size: 19 })], { align: AlignmentType.CENTER, after: 0 }),
    para([run(r.links, { size: 19 })], { align: AlignmentType.CENTER, after: 40 }),
  ];
  for (const s of r.sections) {
    out.push(heading(s.h));
    if (s.note) out.push(para([run(s.note, { italics: true, size: 18, color: '444444' })], { after: 30 }));
    for (const t of s.p ?? []) out.push(para([run(t)], { after: 35 }));
    for (const [k, v] of s.kv ?? []) out.push(para([run(k + ': ', { bold: true }), run(v)], { after: 30 }));
    if (s.project) {
      const p = s.project;
      out.push(para([run(p.title, { bold: true }), run('\t' + p.right, { bold: true })], { tabs: rightTab, keepNext: true, after: 10 }));
      out.push(para([run(p.meta, { italics: true, size: 19 })], { keepNext: true, after: 25 }));
      p.bullets.forEach((b) => out.push(bullet(b)));
    }
    for (const role of s.roles ?? []) {
      out.push(para([run(role.title, { bold: true }), run(` | ${role.org} | ${role.place}`), run('\t' + role.dates, { bold: true })], { tabs: rightTab, keepNext: true, before: 50, after: 15 }));
      role.bullets.forEach((b) => out.push(bullet(b)));
    }
    for (const e of s.earlier ?? []) out.push(para([run(e.title, { bold: true }), run(` | ${e.org} | ${e.place} | ${e.dates}: ${e.text}`)], { after: 30 }));
  }
  return new Document({
    creator: 'Gabriel Olatundun', title: `${r.name} resume`,
    styles: { default: { document: { run: { font: FONT, size: 21 } } } },
    numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 300, hanging: 220 } } } }] }] },
    sections: [{ properties: { page: { size: { width: W, height: 15840 }, margin: { top: 720, bottom: 640, left: MARGIN, right: MARGIN } } }, children: out }],
  });
}

mkdirSync(DOCX_DIR, { recursive: true });
mkdirSync(PDF_DIR, { recursive: true });
for (const r of [ERP, AML]) {
  const docx = join(DOCX_DIR, r.file + '.docx');
  writeFileSync(docx, await Packer.toBuffer(build(r)));
  execFileSync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', DOCX_DIR, docx], { stdio: 'ignore' });
  copyFileSync(join(DOCX_DIR, r.file + '.pdf'), join(PDF_DIR, r.file + '.pdf'));
  console.log('built', r.file);
}
