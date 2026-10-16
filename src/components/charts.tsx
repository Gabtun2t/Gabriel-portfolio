/** Small dependency-free SVG charts. Values always come from computed data. */
import { useState } from 'react';

export const SERIES_COLORS = ['var(--teal)', 'var(--blue)', 'var(--amber)', 'var(--violet)', 'var(--red)', 'var(--green)'];

const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
};
const short = (v: number) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : Math.abs(v) >= 1e3 ? `${Math.round(v / 1e3)}k` : String(Math.round(v)));

export function HBarChart({ data, label, format = (v: number) => String(v), color = 'var(--teal)' }: { data: { label: string; value: number; color?: string }[]; label: string; format?: (v: number) => string; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div role="img" aria-label={`${label}: ${data.map((d) => `${d.label} ${format(d.value)}`).join(', ')}`}>
      {data.map((d) => (
        <div key={d.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 38%) 1fr auto', gap: 10, alignItems: 'center', margin: '6px 0', fontSize: 13 }}>
          <span style={{ color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.label}>{d.label}</span>
          <span style={{ background: 'var(--surface-3)', borderRadius: 4, height: 14, overflow: 'hidden' }}>
            <span style={{ display: 'block', height: '100%', width: `${(d.value / max) * 100}%`, background: d.color ?? color, borderRadius: 4, minWidth: d.value ? 2 : 0 }} />
          </span>
          <span className="mono" style={{ fontSize: 12.5, minWidth: 36, textAlign: 'right' }}>{format(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** Grouped column chart: categories on x, one bar per series. */
export function ColumnChart({ categories, series, label, format = short, height = 220 }: { categories: string[]; series: { name: string; values: number[] }[]; label: string; format?: (v: number) => string; height?: number }) {
  const [hover, setHover] = useState<{ c: number; s: number } | null>(null);
  const W = 640, H = height, padL = 46, padB = 26, padT = 10;
  const max = niceMax(Math.max(...series.flatMap((s) => s.values)));
  const groupW = (W - padL - 8) / categories.length;
  const barW = Math.min(36, (groupW * 0.72) / series.length);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  return (
    <div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} style={{ width: '100%', height: 'auto' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line className="grid-line" x1={padL} x2={W - 4} y1={y(max * f)} y2={y(max * f)} />
            <text x={padL - 6} y={y(max * f) + 4} textAnchor="end">{format(max * f)}</text>
          </g>
        ))}
        {categories.map((c, ci) => {
          const gx = padL + ci * groupW + (groupW - barW * series.length) / 2;
          return (
            <g key={c}>
              {series.map((s, si) => {
                const v = s.values[ci] ?? 0;
                return (
                  <rect key={s.name} x={gx + si * barW} y={y(v)} width={barW - 3} height={Math.max(0, H - padB - y(v))} rx={2}
                    fill={SERIES_COLORS[si % SERIES_COLORS.length]} opacity={hover && (hover.c !== ci || hover.s !== si) ? 0.45 : 1}
                    onMouseEnter={() => setHover({ c: ci, s: si })} onMouseLeave={() => setHover(null)}>
                    <title>{`${s.name} · ${c}: ${format(v)}`}</title>
                  </rect>
                );
              })}
              <text x={padL + ci * groupW + groupW / 2} y={H - 8} textAnchor="middle">{c}</text>
            </g>
          );
        })}
      </svg>
      {series.length > 1 && (
        <div className="legend">{series.map((s, i) => <span key={s.name}><i style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />{s.name}</span>)}</div>
      )}
      {hover && <div className="small muted" aria-live="polite">{series[hover.s].name} · {categories[hover.c]}: <strong>{format(series[hover.s].values[hover.c])}</strong></div>}
    </div>
  );
}

/** Daily series with optional markers (e.g. days with alerted transactions). */
export function DailyChart({ days, values, markers, label, height = 150 }: { days: string[]; values: number[]; markers?: Set<string>; label: string; height?: number }) {
  const W = 720, H = height, padL = 44, padB = 22, padT = 8;
  const max = niceMax(Math.max(...values));
  const step = (W - padL - 6) / days.length;
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} style={{ width: '100%', height: 'auto' }}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line className="grid-line" x1={padL} x2={W} y1={y(max * f)} y2={y(max * f)} />
          <text x={padL - 6} y={y(max * f) + 4} textAnchor="end">{short(max * f)}</text>
        </g>
      ))}
      {days.map((d, i) => (
        <rect key={d} x={padL + i * step} y={y(values[i])} width={Math.max(1, step - 1)} height={H - padB - y(values[i])}
          fill={markers?.has(d) ? 'var(--amber)' : 'var(--blue)'} opacity={markers?.has(d) ? 1 : 0.55}>
          <title>{`${d}: ${short(values[i])}${markers?.has(d) ? ' — includes a rule-flagged transaction' : ''}`}</title>
        </rect>
      ))}
      {days.filter((d) => d.endsWith('-01')).map((d) => (
        <text key={d} x={padL + days.indexOf(d) * step} y={H - 6}>{d.slice(0, 7)}</text>
      ))}
    </svg>
  );
}
