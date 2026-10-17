import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useRoute } from './router';
import { AI_DISCLOSURE, PROFILE } from './content/profile';
import { Home } from './pages/Home';
import { Experience } from './pages/Experience';
import { Labs } from './pages/Labs';
import { AmlLab } from './pages/AmlLab';
import { ReconLab } from './pages/ReconLab';
import { PaymentsLab } from './pages/PaymentsLab';
import { DataLab } from './pages/DataLab';
import { CaseStudies } from './pages/CaseStudies';
import { Architecture } from './pages/Architecture';
import { Contact } from './pages/Contact';
import { Guide } from './pages/Guide';
import { DataDictionary } from './pages/DataDictionary';
import { Status } from './pages/Status';

const NAV = [
  { to: '/labs', label: 'Project lab' },
  { to: '/case-studies', label: 'Case studies' },
  { to: '/architecture', label: 'Architecture' },
  { to: '/experience', label: 'Experience' },
  { to: '/guide', label: 'Recruiter guide' },
  { to: '/contact', label: 'Resume & contact' },
];

const ROUTES: Record<string, { title: string; desc: string; el: () => ReactNode }> = {
  '/': { title: 'Senior Financial Systems & Integration Specialist', desc: 'Gabriel Olatundun (Ottawa): Sage X3 and Sage 300 ERP implementation and financial systems, with AML investigations, reconciliation and payment integration. Four working labs on synthetic data.', el: () => <Home /> },
  '/experience': { title: 'Experience', desc: 'ERP implementation experience (Sage X3, Sage 300), industry experience, career timeline, education and credentials for Gabriel Olatundun.', el: () => <Experience /> },
  '/labs': { title: 'Project lab', desc: 'Four working technical demonstrations on synthetic data: AML investigation, ERP reconciliation, payment API integration and financial data engineering.', el: () => <Labs /> },
  '/labs/aml': { title: 'AML investigation lab', desc: 'Rule-based transaction monitoring and case investigation on synthetic data: alert queue, KYC-related evidence, dispositions and case narratives.', el: () => <AmlLab /> },
  '/labs/reconciliation': { title: 'ERP reconciliation lab', desc: 'Legacy-to-ERP migration reconciliation with transparent matching rules, root-cause tracing, audited corrections and SQL verified on SQLite.', el: () => <ReconLab /> },
  '/labs/payments': { title: 'Payment API integration lab', desc: 'Mock bank payment API and ERP integration: validation, idempotency, retries, timeouts, audit trail and reconciliation.', el: () => <PaymentsLab /> },
  '/labs/data': { title: 'Financial data engineering lab', desc: 'Financial data pipeline on synthetic feeds: validation, quarantine, deduplication, star schema, lineage and control totals.', el: () => <DataLab /> },
  '/case-studies': { title: 'Case studies', desc: 'Technical case studies for each lab: business context, approach, architecture, design decisions, testing, results and limitations.', el: () => <CaseStudies /> },
  '/architecture': { title: 'Architecture', desc: 'Integration, reconciliation and data-flow architecture diagrams for the portfolio labs.', el: () => <Architecture /> },
  '/contact': { title: 'Resume & contact', desc: 'Download Gabriel Olatundun’s resume and contact him by email or LinkedIn.', el: () => <Contact /> },
  '/guide': { title: 'Recruiter guide', desc: 'What to explore in five minutes if you are hiring for AML, ERP or architecture and data roles.', el: () => <Guide /> },
  '/data-dictionary': { title: 'Data dictionary', desc: 'Tables, columns and seeds for every synthetic dataset used in the labs.', el: () => <DataDictionary /> },
  '/status': { title: 'Build status', desc: 'Deployment details, implemented and planned features, and known limitations of this portfolio.', el: () => <Status /> },
};

export function App() {
  const route = useRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const match = ROUTES[route.path];
  const lastPath = useRef(route.path);

  useEffect(() => {
    document.title = `${match ? match.title : 'Not found'} — ${PROFILE.name}`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', match?.desc ?? ROUTES['/'].desc);
    if (lastPath.current !== route.path) {
      window.scrollTo(0, 0);
      mainRef.current?.focus({ preventScroll: true });
      lastPath.current = route.path;
    }
    setMenuOpen(false);
  }, [route.path, match]);

  const active = (to: string) => (to === '/labs' ? route.path.startsWith('/labs') : route.path === to);

  return (
    <>
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>Skip to content</a>
      <header className="site-header">
        <div className="container bar">
          <Link to="/" className="brand">{PROFILE.name}<span>ERP · Financial systems · AML · Integration</span></Link>
          <button className="nav-toggle" aria-expanded={menuOpen} aria-controls="site-nav" onClick={() => setMenuOpen((o) => !o)}>Menu</button>
          <nav id="site-nav" className={`nav ${menuOpen ? 'open' : ''}`} aria-label="Main">
            {NAV.map((n) => <Link key={n.to} to={n.to} aria-current={active(n.to) ? 'page' : undefined}>{n.label}</Link>)}
          </nav>
        </div>
      </header>
      <main id="main" ref={mainRef} tabIndex={-1}>
        {match ? match.el() : <NotFound />}
      </main>
      <footer className="site-footer">
        <div className="container cols">
          <div>
            <h4>{PROFILE.name}</h4>
            <p>{PROFILE.location}<br /><a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>{PROFILE.showPhone && <><br /><a href={`tel:+1${PROFILE.phone.replace(/\D/g, '')}`}>{PROFILE.phone}</a></>}{PROFILE.linkedinUrl && <><br /><a href={PROFILE.linkedinUrl} rel="noopener noreferrer" target="_blank">LinkedIn</a></>}</p>
          </div>
          <div>
            <h4>Labs</h4>
            <ul>
              <li><Link to="/labs/aml">AML investigation</Link></li>
              <li><Link to="/labs/reconciliation">ERP reconciliation</Link></li>
              <li><Link to="/labs/payments">Payment API integration</Link></li>
              <li><Link to="/labs/data">Data engineering</Link></li>
            </ul>
          </div>
          <div>
            <h4>Transparency</h4>
            <ul>
              <li><Link to="/status">Build status (implemented / partial / planned)</Link></li>
              <li><Link to="/data-dictionary">Data dictionary & seeds</Link></li>
              <li><Link to="/guide">What is real vs. simulated</Link></li>
            </ul>
          </div>
        </div>
        <div className="container" style={{ marginTop: 20 }}>
          <small>All demo data is synthetic. Professional history is taken from Gabriel’s resume; the labs are independent portfolio simulations, not client work or production systems, and have not been approved for regulatory use. {AI_DISCLOSURE}</small>
        </div>
      </footer>
    </>
  );
}

function NotFound() {
  return (
    <section className="section">
      <div className="container">
        <h1>Page not found</h1>
        <p className="lead">That address doesn’t match a page on this site.</p>
        <Link to="/" className="btn btn-primary">Go to the home page</Link>
      </div>
    </section>
  );
}
