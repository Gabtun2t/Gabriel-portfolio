/**
 * Simulated corrections. Corrections never edit the source; they produce a new target ledger
 * plus an audit journal, so every change is traceable and reversible (reset).
 */
import type { SourceRow, TargetEntry } from '../../data/recon/generate';
import { GL_MAPPING } from '../../data/recon/generate';
import type { ReconResult } from './match';

export interface CorrectionJournalEntry {
  correctionId: string;
  resultId: string;
  action: string;
  jeId: string;
  before: string;
  after: string;
}

export function applyCorrection(
  result: ReconResult,
  source: SourceRow[],
  target: TargetEntry[],
  journal: CorrectionJournalEntry[],
): { target: TargetEntry[]; journal: CorrectionJournalEntry[] } {
  const c = result.correction;
  if (!c) throw new Error(`${result.resultId} has no automatic correction; it requires human review.`);
  const src = source.find((s) => s.srcId === result.sourceId);
  const id = `COR-${String(journal.length + 1).padStart(3, '0')}`;
  const next = target.map((t) => ({ ...t }));
  const entry = (jeId: string, before: string, after: string): CorrectionJournalEntry => ({ correctionId: id, resultId: result.resultId, action: c.action, jeId, before, after });

  switch (c.action) {
    case 'POST_MISSING': {
      if (!src) throw new Error('Source row not found');
      const jeId = `JE-COR-${String(journal.length + 1).padStart(3, '0')}`;
      const gl = GL_MAPPING.find((m) => m.segment === src.segment)!.glAccount;
      next.push({ jeId, postingDate: src.postingDate, glAccount: gl, reference: src.reference, amount: src.amount, customerId: src.customerId, migrationBatch: null, loadRun: null, stagingRowId: null, entryType: 'CORRECTION', status: 'POSTED', description: `Correction: post missing ${src.srcId}` });
      return { target: next, journal: [...journal, entry(jeId, '(none)', `${src.reference} ${src.amount.toFixed(2)} GL ${gl}`)] };
    }
    case 'REVERSE_DUPLICATE': {
      const t = next.find((x) => x.jeId === c.targetJeId)!;
      t.status = 'REVERSED';
      return { target: next, journal: [...journal, entry(t.jeId, 'POSTED', 'REVERSED')] };
    }
    case 'REPAIR_REFERENCE': {
      const t = next.find((x) => x.jeId === c.targetJeId)!;
      const before = t.reference;
      t.reference = src!.reference;
      return { target: next, journal: [...journal, entry(t.jeId, JSON.stringify(before), JSON.stringify(t.reference))] };
    }
    case 'RECLASS_GL': {
      const t = next.find((x) => x.jeId === c.targetJeId)!;
      const before = t.glAccount;
      t.glAccount = GL_MAPPING.find((m) => m.segment === src!.segment)!.glAccount;
      return { target: next, journal: [...journal, entry(t.jeId, `GL ${before}`, `GL ${t.glAccount}`)] };
    }
    case 'CORRECT_AMOUNT': {
      const t = next.find((x) => x.jeId === c.targetJeId)!;
      const before = t.amount;
      t.amount = src!.amount;
      return { target: next, journal: [...journal, entry(t.jeId, before.toFixed(2), t.amount.toFixed(2))] };
    }
    case 'CORRECT_DATE': {
      const t = next.find((x) => x.jeId === c.targetJeId)!;
      const before = t.postingDate;
      t.postingDate = src!.postingDate;
      return { target: next, journal: [...journal, entry(t.jeId, before, t.postingDate)] };
    }
  }
}

export function applyAll(results: ReconResult[], source: SourceRow[], target: TargetEntry[], journal: CorrectionJournalEntry[] = []) {
  let state = { target, journal };
  for (const r of results) if (r.correction) state = applyCorrection(r, source, state.target, state.journal);
  return state;
}
