/**
 * Minimal hash router. Hash URLs (#/labs/aml?case=…) work on any static host — GitHub Pages,
 * Netlify, Vercel, S3 — with no rewrite rules, and every view is deep-linkable.
 */
import { useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from 'react';

export interface Route { path: string; query: URLSearchParams }

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  return { path: path || '/', query: new URLSearchParams(qs) };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function href(path: string, query?: Record<string, string | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) if (v) q.set(k, v);
  const s = q.toString();
  return `#${path}${s ? `?${s}` : ''}`;
}

export function navigate(path: string, query?: Record<string, string | null | undefined>, opts: { replace?: boolean } = {}) {
  const target = href(path, query);
  if (opts.replace) {
    history.replaceState(null, '', target);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = target.slice(1);
  }
}

export function Link({ to, query, children, ...rest }: { to: string; query?: Record<string, string | null | undefined>; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={href(to, query)} {...rest}>{children}</a>;
}
