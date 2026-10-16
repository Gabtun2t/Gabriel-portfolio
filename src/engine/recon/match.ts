/**
 * Source-to-target reconciliation with transparent matching rules.
 *
 * The matcher deliberately does NOT use lineage keys (stagingRowId) to pair rows — in a real
 * migration those often don't survive. It pairs on business keys, then uses lineage only to
 * explain root causes. The same rules are implemented in sql/reconciliation.sql and checked
 * against this module by scripts/check_sql.py.
 */
import { daysBetween, swapMonthDay } from '../../lib/dates';
import { GL_MAPPING, GL_NAMES, type SourceRow, type StagingRow, type TargetEntry } from '../../data/recon/generate';

export const DATE_TOLERANCE_DAYS = 3;
export const AMOUNT_TOLERANCE = 0.005;

export type ReconStatus =
  | 'MATCHED'
  | 'REFERENCE_CORRUPTED'
  | 'WRONG_MAPPING'
  | 'AMOUNT_MISMATCH'
  | 'DATE_MISMATCH'
  | 'DUPLICATE_IN_TARGET'
  | 'MISSING_IN_TARGET'
  | 'UNMATCHED_IN_TARGET';

export const STATUS_INFO: Record<ReconStatus, { label: string; tone: 'ok' | 'warn' | 'bad' | 'info' }> = {
  MATCHED: { label: 'Matched', tone: 'ok' },
  REFERENCE_CORRUPTED: { label: 'Corrupted reference', tone: 'warn' },
  WRONG_MAPPING: { label: 'Wrong GL mapping', tone: 'warn' },
  AMOUNT_MISMATCH: { label: 'Amount difference', tone: 'bad' },
  DATE_MISMATCH: { label: 'Date difference', tone: 'warn' },
  DUPLICATE_IN_TARGET: { label: 'Duplicate import', tone: 'bad' },
  MISSING_IN_TARGET: { label: 'Missing in ERP', tone: 'bad' },
  UNMATCHED_IN_TARGET: { label: 'ERP entry with no source', tone: 'info' },
};

export const MATCHING_RULES = [
  { id: 'M0', text: 'Normalize references: trim, upper-case, remove spaces, hyphens and the Unicode replacement character (U+FFFD).' },
  { id: 'M1', text: 'Key match: same customer and same normalized reference. Among several candidates prefer the closest amount, then the closest date, then the lowest load run.' },
  { id: 'M2', text: `Fuzzy match (only for sources still unmatched): same customer, same amount (to the cent), posting dates within ${DATE_TOLERANCE_DAYS} days, same first four reference characters, target not yet claimed.` },
  { id: 'M3', text: 'Extra key-matched targets with the same amount and a date within 1 day of the chosen target are duplicates.' },
  { id: 'M4', text: `Classify each pair, first failing check wins: amount differs by > $${AMOUNT_TOLERANCE.toFixed(3)} → AMOUNT_MISMATCH; date differs by > ${DATE_TOLERANCE_DAYS} days → DATE_MISMATCH; GL account ≠ mapping for the segment → WRONG_MAPPING; raw reference differs → REFERENCE_CORRUPTED; otherwise MATCHED (1–${DATE_TOLERANCE_DAYS} day differences are noted).` },
  { id: 'M5', text: 'Sources with no pair → MISSING_IN_TARGET. Posted targets never claimed → UNMATCHED_IN_TARGET. Reversed targets are ignored.' },
];

export function normalizeRef(ref: string): string {
  return ref.trim().toUpperCase().replace(/[\s\-�]/g, '');
}

export type CorrectionAction = 'POST_MISSING' | 'REVERSE_DUPLICATE' | 'REPAIR_REFERENCE' | 'RECLASS_GL' | 'CORRECT_AMOUNT' | 'CORRECT_DATE';

export interface ProposedCorrection {
  action: CorrectionAction;
  description: string;
  targetJeId: string | null;
}

export interface RootCause {
  code: string;
  label: string;
  evidence: string[];
}

export interface ReconResult {
  resultId: string;
  status: ReconStatus;
  sourceId: string | null;
  targetIds: string[];
  matchedBy: 'M1' | 'M2' | null;
  notes: string[];
  amountDiff: number | null;
  dateDiffDays: number | null;
  rootCause: RootCause;
  correction: ProposedCorrection | null;
}

export interface ReconSummary {
  total: number;
  byStatus: Record<ReconStatus, number>;
  sourceRows: number;
  targetRows: number;
  matchRate: number;
  sourceTotal: number;
  targetTotal: number;
  netDifference: number;
}

const expectedGl = (seg: string) => GL_MAPPING.find((m) => m.segment === seg)!.glAccount;

function amountCause(src: number, tgt: number): RootCause {
  const ratio = tgt / src;
  const diff = Math.round((tgt - src) * 100) / 100;
  const digits = (v: number) => v.toFixed(2).replace(/\D/g, '').split('').sort().join('');
  if (Math.abs(ratio - 100) < 1e-9 || Math.abs(ratio - 0.01) < 1e-9) {
    return { code: 'DECIMAL_SHIFT', label: 'Decimal scale shift (×100)', evidence: [`Target is exactly ${ratio === 100 ? '100×' : '1/100 of'} the source amount.`, 'Consistent with an implied-decimal amount field not being scaled during load (defect DEF-031).'] };
  }
  if (Math.abs(diff) % 9 === 0 && digits(src) === digits(tgt)) {
    return { code: 'DIGIT_TRANSPOSITION', label: 'Digit transposition', evidence: [`Difference ${diff.toFixed(2)} is divisible by 9 and both amounts contain the same digits — a classic keying/transposition signature.`] };
  }
  if (Math.abs(diff) <= 0.05) {
    return { code: 'ROUNDING', label: 'Rounding difference', evidence: [`Difference of ${diff.toFixed(2)} — consistent with rounding to the nearest 0.05/0.10 in a transform step.`] };
  }
  return { code: 'UNEXPLAINED_AMOUNT', label: 'Unexplained amount difference', evidence: [`Difference ${diff.toFixed(2)} has no recognized pattern — requires investigation.`] };
}

function refCause(src: string, tgt: string): RootCause {
  if (tgt.includes('�')) return { code: 'REF_ENCODING', label: 'Character-encoding corruption', evidence: ['Target reference contains the Unicode replacement character (U+FFFD) — a byte sequence was not valid in the target encoding.'] };
  if (normalizeRef(tgt) === normalizeRef(src)) return { code: 'REF_FORMAT', label: 'Formatting difference', evidence: ['References are equal after trimming, case-folding and removing separators.'] };
  if (normalizeRef(src).startsWith(normalizeRef(tgt))) return { code: 'REF_TRUNCATED', label: 'Truncated reference', evidence: [`Target keeps only the first ${tgt.length} characters — consistent with a shorter field length in the target schema.`] };
  const sorted = (s: string) => normalizeRef(s).split('').sort().join('');
  if (sorted(src) === sorted(tgt)) return { code: 'REF_TRANSPOSED', label: 'Transposed characters', evidence: ['Same characters in a different order — likely a manual re-keying error.'] };
  return { code: 'REF_OTHER', label: 'Reference differs', evidence: ['Matched on customer, amount and date; reference differs.'] };
}

export function reconcile(source: SourceRow[], targetAll: TargetEntry[], staging: StagingRow[]): { results: ReconResult[]; summary: ReconSummary } {
  const target = targetAll.filter((t) => t.status === 'POSTED');
  const claimed = new Set<string>();
  const byKey = new Map<string, TargetEntry[]>();
  for (const t of target) {
    const key = `${t.customerId}|${normalizeRef(t.reference)}`;
    byKey.set(key, [...(byKey.get(key) ?? []), t]);
  }
  const results: ReconResult[] = [];
  const pairs = new Map<string, { tgt: TargetEntry; by: 'M1' | 'M2'; dups: TargetEntry[] }>();

  // M1 – key match
  for (const s of source) {
    const cands = (byKey.get(`${s.customerId}|${normalizeRef(s.reference)}`) ?? []).filter((t) => !claimed.has(t.jeId));
    if (!cands.length) continue;
    const ranked = [...cands].sort((a, b) =>
      Math.abs(a.amount - s.amount) - Math.abs(b.amount - s.amount) ||
      Math.abs(daysBetween(s.postingDate, a.postingDate)) - Math.abs(daysBetween(s.postingDate, b.postingDate)) ||
      (a.loadRun ?? 0) - (b.loadRun ?? 0) || a.jeId.localeCompare(b.jeId));
    const best = ranked[0];
    const dups = ranked.slice(1).filter((t) => Math.abs(t.amount - best.amount) <= AMOUNT_TOLERANCE && Math.abs(daysBetween(best.postingDate, t.postingDate)) <= 1);
    claimed.add(best.jeId);
    dups.forEach((d) => claimed.add(d.jeId));
    pairs.set(s.srcId, { tgt: best, by: 'M1', dups });
  }
  // M2 – fuzzy match
  for (const s of source) {
    if (pairs.has(s.srcId)) continue;
    const cand = target
      .filter((t) => !claimed.has(t.jeId) && t.customerId === s.customerId && Math.abs(t.amount - s.amount) <= AMOUNT_TOLERANCE &&
        Math.abs(daysBetween(s.postingDate, t.postingDate)) <= DATE_TOLERANCE_DAYS && normalizeRef(t.reference).slice(0, 4) === normalizeRef(s.reference).slice(0, 4))
      .sort((a, b) => a.jeId.localeCompare(b.jeId))[0];
    if (cand) {
      claimed.add(cand.jeId);
      pairs.set(s.srcId, { tgt: cand, by: 'M2', dups: [] });
    }
  }

  let n = 1;
  const rid = () => `R-${String(n++).padStart(4, '0')}`;
  for (const s of source) {
    const p = pairs.get(s.srcId);
    const stg = staging.find((x) => x.srcId === s.srcId);
    if (!p) {
      results.push({
        resultId: rid(), status: 'MISSING_IN_TARGET', sourceId: s.srcId, targetIds: [], matchedBy: null, notes: [], amountDiff: null, dateDiffDays: null,
        rootCause: stg?.loadStatus === 'REJECTED'
          ? { code: 'LOAD_REJECTED', label: 'Rejected during load', evidence: [`Staging row ${stg.stagingRowId} was rejected: ${stg.rejectReason}.`, 'The rejection was logged but not surfaced to the migration sign-off report.'] }
          : { code: 'NOT_STAGED', label: 'Not present in staging', evidence: ['The row never reached staging — check the extract/transfer step.'] },
        correction: { action: 'POST_MISSING', description: `Post the missing entry from source ${s.srcId} (${s.reference}, ${s.amount.toFixed(2)}) to GL ${expectedGl(s.segment)}.`, targetJeId: null },
      });
      continue;
    }
    const t = p.tgt;
    const amountDiff = Math.round((t.amount - s.amount) * 100) / 100;
    const dateDiff = daysBetween(s.postingDate, t.postingDate);
    const notes: string[] = [];
    let status: ReconStatus = 'MATCHED';
    let rootCause: RootCause = { code: 'NONE', label: 'No exception', evidence: [] };
    let correction: ProposedCorrection | null = null;

    if (Math.abs(amountDiff) > AMOUNT_TOLERANCE) {
      status = 'AMOUNT_MISMATCH';
      rootCause = amountCause(s.amount, t.amount);
      correction = { action: 'CORRECT_AMOUNT', description: `Adjust ${t.jeId} amount ${t.amount.toFixed(2)} → ${s.amount.toFixed(2)} (source of truth: legacy extract row ${s.extractRow}).`, targetJeId: t.jeId };
    } else if (Math.abs(dateDiff) > DATE_TOLERANCE_DAYS) {
      status = 'DATE_MISMATCH';
      rootCause = swapMonthDay(s.postingDate) === t.postingDate
        ? { code: 'DATE_DAY_MONTH_SWAP', label: 'Day and month swapped on import', evidence: [`Source ${s.postingDate} vs target ${t.postingDate} — the day and month are exchanged (DD/MM vs MM/DD parsing).`] }
        : { code: 'DATE_SHIFT', label: 'Posting date shifted', evidence: [`Dates differ by ${dateDiff} days.`] };
      correction = { action: 'CORRECT_DATE', description: `Correct ${t.jeId} posting date ${t.postingDate} → ${s.postingDate}.`, targetJeId: t.jeId };
    } else if (t.glAccount !== expectedGl(s.segment)) {
      status = 'WRONG_MAPPING';
      rootCause = { code: 'GL_MAPPING', label: 'Wrong GL account mapping', evidence: [`Segment ${s.segment} should map to ${expectedGl(s.segment)} (${GL_NAMES[expectedGl(s.segment)]}) but was posted to ${t.glAccount} (${GL_NAMES[t.glAccount] ?? 'unknown'}).`, `Staging used mapping table ${stg?.mappingVersion ?? 'unknown'}; v1.3 is the approved version.`] };
      correction = { action: 'RECLASS_GL', description: `Reclassify ${t.jeId} from GL ${t.glAccount} to GL ${expectedGl(s.segment)}.`, targetJeId: t.jeId };
    } else if (t.reference !== s.reference) {
      status = 'REFERENCE_CORRUPTED';
      rootCause = refCause(s.reference, t.reference);
      correction = { action: 'REPAIR_REFERENCE', description: `Restore ${t.jeId} reference “${t.reference}” → “${s.reference}” from the source extract.`, targetJeId: t.jeId };
    }
    if (dateDiff !== 0 && Math.abs(dateDiff) <= DATE_TOLERANCE_DAYS) notes.push(`Posting date differs by ${dateDiff} day(s) — within the ${DATE_TOLERANCE_DAYS}-day tolerance.`);
    if (p.by === 'M2') notes.push('Paired by fuzzy rule M2 (customer + amount + date window); the reference did not match exactly.');

    results.push({ resultId: rid(), status, sourceId: s.srcId, targetIds: [t.jeId], matchedBy: p.by, notes, amountDiff, dateDiffDays: dateDiff, rootCause, correction });

    for (const d of p.dups) {
      results.push({
        resultId: rid(), status: 'DUPLICATE_IN_TARGET', sourceId: s.srcId, targetIds: [d.jeId], matchedBy: 'M1', notes: [`Duplicate of ${t.jeId}.`], amountDiff: d.amount, dateDiffDays: daysBetween(s.postingDate, d.postingDate),
        rootCause: {
          code: 'NON_IDEMPOTENT_RELOAD', label: 'Batch re-run inserted a second copy',
          evidence: [`${t.jeId} came from load run ${t.loadRun}; ${d.jeId} from load run ${d.loadRun} of ${d.migrationBatch}.`, `Staging row ${d.stagingRowId} shows load runs [${stg?.loadRuns.join(', ')}] — the load was not idempotent (defect DEF-032).`],
        },
        correction: { action: 'REVERSE_DUPLICATE', description: `Reverse duplicate entry ${d.jeId} (keep ${t.jeId}).`, targetJeId: d.jeId },
      });
    }
  }
  for (const t of target) {
    if (claimed.has(t.jeId)) continue;
    results.push({
      resultId: rid(), status: 'UNMATCHED_IN_TARGET', sourceId: null, targetIds: [t.jeId], matchedBy: null, notes: [], amountDiff: t.amount, dateDiffDays: null,
      rootCause: t.entryType === 'MANUAL_JOURNAL'
        ? { code: 'MANUAL_NO_SOURCE', label: 'Manual journal with no source document', evidence: [`${t.jeId} “${t.description}” was posted manually and has no counterpart in the legacy extract.`, 'Cannot be auto-corrected: finance must confirm the supporting documentation or reverse it.'] }
        : { code: 'ORPHAN_TARGET', label: 'Target entry with no source', evidence: ['No legacy row matches this entry under rules M1–M2.'] },
      correction: null,
    });
  }

  const byStatus = Object.fromEntries(Object.keys(STATUS_INFO).map((k) => [k, 0])) as Record<ReconStatus, number>;
  results.forEach((r) => byStatus[r.status]++);
  const sourceTotal = source.reduce((s, r) => s + r.amount, 0);
  const targetTotal = target.reduce((s, r) => s + r.amount, 0);
  return {
    results,
    summary: {
      total: results.length, byStatus, sourceRows: source.length, targetRows: target.length,
      matchRate: byStatus.MATCHED / source.length,
      sourceTotal: Math.round(sourceTotal * 100) / 100,
      targetTotal: Math.round(targetTotal * 100) / 100,
      netDifference: Math.round((targetTotal - sourceTotal) * 100) / 100,
    },
  };
}
