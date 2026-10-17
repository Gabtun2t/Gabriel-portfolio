import { useRef, type ReactNode } from 'react';

/**
 * Plain-English brief at the top of every lab, with progressive disclosure:
 * always visible: what problem it solves, why it matters, what the demonstration shows;
 * then "Explore the interactive lab" (scrolls to the lab) and "View technical details"
 * (capabilities, computed findings, limitations and the engineering note).
 */
export function LabBrief({ problem, why, proves, capabilities, findings, limitations, technical }: {
  problem: ReactNode;
  why: ReactNode;
  proves: ReactNode;
  capabilities: string[];
  findings: ReactNode[];
  limitations: string[];
  technical?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const explore = () => {
    let next = ref.current?.nextElementSibling as HTMLElement | null;
    while (next && next.offsetHeight < 4) next = next.nextElementSibling as HTMLElement | null;
    next?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    next?.querySelector<HTMLElement>('button, a, input, select, [tabindex]')?.focus({ preventScroll: true });
  };
  return (
    <section ref={ref} className="card brief" aria-labelledby="brief-title">
      <h2 id="brief-title" style={{ fontSize: 20 }}>About this lab</h2>
      <div className="brief-lead">
        <div><h3>What problem does this solve?</h3><p>{problem}</p></div>
        <div><h3>Why does it matter?</h3><p>{why}</p></div>
        <div><h3>What does the demonstration show?</h3><p>{proves}</p></div>
      </div>
      <div className="brief-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={explore}>Explore the interactive lab ↓</button>
        <span className="badge badge-sim">Simulation · synthetic data</span>
      </div>
      <details className="disclosure" style={{ marginTop: 14 }}>
        <summary>View technical details</summary>
        <div className="body">
          <div className="brief-grid">
            <div>
              <h3>Technical capabilities</h3>
              <ul>{capabilities.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
            <div>
              <h3>Key findings <span className="badge badge-sim" style={{ marginLeft: 4 }}>Simulation</span></h3>
              <ul>{findings.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </div>
            <div>
              <h3>Limitations</h3>
              <ul>{limitations.map((l) => <li key={l}>{l}</li>)}</ul>
            </div>
          </div>
          {technical && <div className="small" style={{ marginTop: 14 }}><h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--teal-ink)' }}>Engineering notes</h3>{technical}</div>}
        </div>
      </details>
    </section>
  );
}
