/** Declarative box-and-arrow diagrams rendered as inline SVG (theme-aware via CSS classes). */
export interface DNode { id: string; x: number; y: number; w?: number; h?: number; title: string; sub?: string; tone?: 'accent' | 'warn' | 'dark' }
export interface DEdge { from: string; to: string; label?: string; tone?: 'accent' | 'warn'; fromSide?: 'r' | 'b' | 'l' | 't'; toSide?: 'r' | 'b' | 'l' | 't' }

export function Diagram({ nodes, edges, width, height, label }: { nodes: DNode[]; edges: DEdge[]; width: number; height: number; label: string }) {
  const byId = new Map(nodes.map((n) => [n.id, { ...n, w: n.w ?? 160, h: n.h ?? 56 }]));
  const anchor = (n: DNode & { w: number; h: number }, side: 'r' | 'b' | 'l' | 't') =>
    side === 'r' ? [n.x + n.w, n.y + n.h / 2] : side === 'l' ? [n.x, n.y + n.h / 2] : side === 'b' ? [n.x + n.w / 2, n.y + n.h] : [n.x + n.w / 2, n.y];
  const markerId = `arrow-${label.replace(/\W/g, '').slice(0, 20)}`;
  return (
    <svg className="diagram" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <defs>
        {['', 'accent', 'warn'].map((t) => (
          <marker key={t} id={`${markerId}${t}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" style={{ fill: t === 'accent' ? 'var(--teal)' : t === 'warn' ? 'var(--amber)' : 'var(--muted)' }} />
          </marker>
        ))}
      </defs>
      {edges.map((e, i) => {
        const a = byId.get(e.from)!, b = byId.get(e.to)!;
        const fs = e.fromSide ?? (b.x > a.x + a.w ? 'r' : b.y > a.y ? 'b' : b.x + b.w < a.x ? 'l' : 't');
        const ts = e.toSide ?? (fs === 'r' ? 'l' : fs === 'l' ? 'r' : fs === 'b' ? 't' : 'b');
        const [x1, y1] = anchor(a, fs), [x2, y2] = anchor(b, ts);
        // Cubic curve whose tangents leave/enter perpendicular to the chosen sides.
        const dx = Math.max(30, Math.abs(x2 - x1) / 2), dy = Math.max(30, Math.abs(y2 - y1) / 2);
        const out: Record<string, [number, number]> = { r: [dx, 0], l: [-dx, 0], b: [0, dy], t: [0, -dy] };
        const c1 = [x1 + out[fs][0], y1 + out[fs][1]], c2 = [x2 + out[ts][0], y2 + out[ts][1]];
        const d = `M${x1},${y1} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${x2},${y2}`;
        return (
          <g key={i}>
            <path className={`edge ${e.tone ?? ''}`} d={d} markerEnd={`url(#${markerId}${e.tone ?? ''})`} />
            {e.label && <text className="lbl" x={(x1 + 3 * c1[0] + 3 * c2[0] + x2) / 8} y={(y1 + 3 * c1[1] + 3 * c2[1] + y2) / 8 + (fs === 'b' && ts === 'b' ? 14 : -6)} textAnchor="middle">{e.label}</text>}
          </g>
        );
      })}
      {[...byId.values()].map((n) => (
        <g key={n.id}>
          <rect className={`box ${n.tone ?? ''}`} x={n.x} y={n.y} width={n.w} height={n.h} rx={8} />
          <text className="title" x={n.x + n.w / 2} y={n.y + (n.sub ? n.h / 2 - 3 : n.h / 2 + 4)} textAnchor="middle">{n.title}</text>
          {n.sub && <text className="sub" x={n.x + n.w / 2} y={n.y + n.h / 2 + 13} textAnchor="middle">{n.sub}</text>}
        </g>
      ))}
    </svg>
  );
}
