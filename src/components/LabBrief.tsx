import type { ReactNode } from 'react';

/**
 * Plain-English business brief shown at the top of every lab:
 * problem → why it matters → what this proves → capabilities → key findings (computed) → limitations,
 * with a deeper technical note for engineering managers.
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
  return (
    <section className="card brief" aria-labelledby="brief-title">
      <h2 id="brief-title" style={{ fontSize: 20 }}>Lab brief</h2>
      <div className="brief-grid">
        <div><h3>1 · Business problem</h3><p>{problem}</p></div>
        <div><h3>2 · Why it matters</h3><p>{why}</p></div>
        <div><h3>3 · What this demonstration proves</h3><p>{proves}</p></div>
        <div>
          <h3>4 · Technical capabilities</h3>
          <ul>{capabilities.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
        <div>
          <h3>5 · Key findings <span className="badge badge-sim" style={{ marginLeft: 4 }}>Simulation</span></h3>
          <ul>{findings.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </div>
        <div>
          <h3>6 · Limitations</h3>
          <ul>{limitations.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
      </div>
      {technical && (
        <details className="disclosure" style={{ marginTop: 14 }}>
          <summary>Technical detail for engineering managers</summary>
          <div className="body small">{technical}</div>
        </details>
      )}
    </section>
  );
}
