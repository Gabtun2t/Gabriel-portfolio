import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useRoute } from './router';
import { PROFILE } from './content/profile';
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

const ROUTES: Record<string, { title: string; el: () => ReactNode }> = {
  '/': { title: 'Financial Systems, AML & Integration', el: () => <Home /> },
  '/experience': { title: 'Experience', el: () => <Experience /> },
  '/labs': { title: 'Project lab', el: () => <Labs /> },
  '/labs/aml': { title: 'AML investigation lab', el: () => <AmlLab /> },
  '/labs/reconciliation': { title: 'ERP reconciliation lab', el: () => <ReconLab /> },
  '/labs/payments': { title: 'Payment API integration lab', el: () => <PaymentsLab /> },
  '/labs/data': { title: 'Financial data engineering lab', el: () => <DataLab /> },
  '/case-studies': { title: 'Case studies', el: () => <CaseStudies /> },
  '/architecture': { title: 'Architecture', el: () => <Architecture /> },
  '/contact': { title: 'Resume & contact', el: () => <Contact /> },
  '/guide': { title: 'Recruiter guide', el: () => <Guide /> },
  '/data-dictionary': { title: 'Data dictionary', el: () => <DataDictionary /> },
  '/status': { title: 'Build status', el: () => <Status /> },
};

export function App() {
  const route = useRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const match = ROUTES[route.path];
  const lastPath = useRef(route.path);

  useEffect(() => {
    document.title = `${match ? match.title : 'Not found'} — ${PROFILE.name}`;
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
          <Link to="/" className="brand">{PROFILE.name}<span>Financial systems · AML · Integration</span></Link>
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
            <p>{PROFILE.location}<br /><a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>{PROFILE.linkedinUrl && <><br /><a href={PROFILE.linkedinUrl} rel="noopener noreferrer" target="_blank">LinkedIn</a></>}</p>
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
          <small>All demo data is synthetic. Professional history is taken from Gabriel’s resume; the labs are independent portfolio simulations, not client work or production systems.</small>
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
