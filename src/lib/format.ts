const cad = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });
const cad0 = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('en-CA');

export const money = (v: number) => cad.format(v);
export const money0 = (v: number) => cad0.format(v);
export const count = (v: number) => num.format(v);
export const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;

export function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${d}, ${y}`;
}

/** Mask all but the last 4 characters of an account number (used in audit logs and UI). */
export function maskAccount(acct: string): string {
  if (acct.length <= 4) return acct;
  return '•'.repeat(Math.max(0, acct.length - 4)) + acct.slice(-4);
}
