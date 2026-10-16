import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function SimBanner({ children }: { children?: ReactNode }) {
  return (
    <div className="sim-banner" role="note">
      <span className="badge badge-sim">Simulation</span>
      <span>
        <strong>Synthetic data only.</strong>{' '}
        {children ?? 'All people, businesses, accounts and transactions are fictional and generated from a fixed seed. Nothing here is a production system or a client engagement.'}
      </span>
    </div>
  );
}

export function Badge({ tone = 'neutral', children, title }: { tone?: string; children: ReactNode; title?: string }) {
  return <span className={`badge badge-${tone}`} title={title}>{children}</span>;
}

export function Kpi({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: string }[]; value: T; onChange: (t: T) => void; label: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => { refs.current[i] = el; }}
          role="tab"
          id={`tab-${t.id}`}
          aria-selected={value === t.id}
          aria-controls={`panel-${t.id}`}
          tabIndex={value === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            onChange(tabs[next].id);
            refs.current[next]?.focus();
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Lightweight syntax tint for TS / SQL (comments, strings, keywords, numbers). Escapes HTML first. */
function tint(code: string, lang: 'ts' | 'sql' | 'json' | 'text'): string {
  const esc = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (lang === 'text') return esc;
  const kw = lang === 'sql'
    ? /\b(SELECT|FROM|WHERE|JOIN|LEFT|ON|AND|OR|NOT|IN|GROUP BY|ORDER BY|HAVING|WITH|AS|CASE|WHEN|THEN|ELSE|END|UNION ALL|UNION|CREATE|VIEW|TABLE|DROP|IF EXISTS|IS|NULL|BETWEEN|LIMIT|DESC|USING|PRIMARY KEY|REFERENCES|OVER|PARTITION BY|ROW_NUMBER|COUNT|SUM|MIN|MAX|ABS|ROUND|COALESCE|DISTINCT)\b/g
    : /\b(export|const|let|function|return|if|else|for|of|in|new|type|interface|import|from|switch|case|break|continue|true|false|null|undefined|as|class|private|readonly|throw)\b/g;
  const tokens: string[] = [];
  // Placeholders use private-use characters so later keyword/number passes cannot match inside them.
  const enc = (i: number) => String(i).replace(/\d/g, (d) => String.fromCharCode(0xe000 + Number(d)));
  const stash = (cls: string) => (m: string) => { tokens.push(`<span class="${cls}">${m}</span>`); return `\u0000${enc(tokens.length - 1)}\u0000`; };
  let out = esc;
  out = out.replace(lang === 'sql' ? /--[^\n]*/g : /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, stash('c'));
  out = out.replace(lang === 'sql' ? /'(?:[^']|'')*'/g : /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, stash('s'));
  out = out.replace(kw, stash('k'));
  out = out.replace(/\b\d[\d_.]*\b/g, stash('n'));
  return out.replace(/\u0000([\ue000-\ue009]+)\u0000/g, (_, i: string) => tokens[Number(i.replace(/[\ue000-\ue009]/g, (c) => String(c.charCodeAt(0) - 0xe000)))]);
}

export function CodeBlock({ code, lang = 'ts', title, maxHeight }: { code: string; lang?: 'ts' | 'sql' | 'json' | 'text'; title?: string; maxHeight?: number }) {
  const html = useMemo(() => tint(code, lang), [code, lang]);
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="code-head">
        <span className="mono">{title ?? lang.toUpperCase()}</span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            try {
              void navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
            } catch { /* clipboard unavailable */ }
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="code" style={maxHeight ? { maxHeight } : undefined} tabIndex={0}><code dangerouslySetInnerHTML={{ __html: html }} /></pre>
    </div>
  );
}

/** Extract a top-level function/const block from a source file by name (for showing exact running code). */
export function extractBlock(source: string, name: string): string {
  const lines = source.split('\n');
  const start = lines.findIndex((l) => new RegExp(`^(export )?(async )?(function|const|class) ${name}\\b`).test(l));
  if (start < 0) return `// ${name} not found`;
  let depth = 0;
  let seen = false;
  for (let i = start; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{' || ch === '[' || ch === '(') { depth++; seen = true; }
      if (ch === '}' || ch === ']' || ch === ')') depth--;
    }
    if (seen && depth <= 0) return lines.slice(start, i + 1).join('\n');
  }
  return lines.slice(start).join('\n');
}

export function Modal({ title, onClose, children, actions }: { title: string; onClose: () => void; children: ReactNode; actions?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus(); };
  }, [onClose]);
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <header>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <div className="row">{actions}<button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button></div>
        </header>
        <div className="body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export type SortDir = 'asc' | 'desc';
export function useSort<T>(rows: T[], initial: { key: keyof T; dir: SortDir }) {
  const [sort, setSort] = useState(initial);
  const sorted = useMemo(() => {
    const s = [...rows].sort((a, b) => {
      const x = a[sort.key] as unknown as string | number;
      const y = b[sort.key] as unknown as string | number;
      return x < y ? -1 : x > y ? 1 : 0;
    });
    return sort.dir === 'asc' ? s : s.reverse();
  }, [rows, sort]);
  const header = (key: keyof T, label: string, className?: string) => (
    <th className={className} aria-sort={sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button className="sort-btn" onClick={() => setSort((p) => ({ key, dir: p.key === key && p.dir === 'desc' ? 'asc' : 'desc' }))}>
        {label}
        <span aria-hidden="true">{sort.key === key ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
      </button>
    </th>
  );
  return { sorted, header };
}

export function downloadText(filename: string, text: string, type = 'text/plain') {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** localStorage wrapper that never throws (private mode, blocked storage, sandboxed frames). */
export const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = window.localStorage.getItem(key);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch { return fallback; }
  },
  set(key: string, value: unknown) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
  remove(key: string) {
    try { window.localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

export function StatusPill({ status }: { status: 'Implemented' | 'Partial' | 'Planned' }) {
  const tone = status === 'Implemented' ? 'green' : status === 'Partial' ? 'amber' : 'neutral';
  return <Badge tone={tone}>{status}</Badge>;
}
