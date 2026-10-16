/**
 * Disposition validation and case-narrative generation.
 *
 * The simulation never decides an outcome. It validates that the visitor's decision is
 * *reasoned and supported* (rationale + reviewed evidence, and documentary support before
 * closing), then records it.
 */
import type { AmlDataset } from '../../data/aml/types';
import type { Alert, EvidenceItem } from './alerts';
import { explainedRules } from './alerts';
import { ruleById, type RuleId } from './rules';

export type DispositionCode = 'FURTHER_INVESTIGATION' | 'REQUEST_INFORMATION' | 'ESCALATE_TO_COMPLIANCE' | 'CLOSE_EXPLAINED_EXCEPTION';

export const DISPOSITIONS: { code: DispositionCode; label: string; help: string }[] = [
  { code: 'FURTHER_INVESTIGATION', label: 'Further investigation', help: 'More internal research is needed before a decision (counterparties, history, linked accounts).' },
  { code: 'REQUEST_INFORMATION', label: 'Request information', help: 'Ask the customer (through the appropriate channel) for documents that would explain the activity.' },
  { code: 'ESCALATE_TO_COMPLIANCE', label: 'Escalate to compliance', help: 'Refer the case with the evidence to the compliance function for their assessment and any reporting decision.' },
  { code: 'CLOSE_EXPLAINED_EXCEPTION', label: 'Close as explained exception', help: 'Only where documented evidence explains every triggered rule (e.g. a confirmed data defect or documented seasonality).' },
];

export const MIN_RATIONALE_CHARS = 40;

export interface DispositionInput {
  code: DispositionCode;
  rationale: string;
  reviewedEvidenceIds: string[];
  analyst: string;
}

export interface DispositionRecord extends DispositionInput {
  caseId: string;
  recordedAt: string;
}

export interface CloseEligibility {
  allowed: boolean;
  unexplained: RuleId[];
  reason: string;
}

export function closeEligibility(ds: AmlDataset, alert: Alert): CloseEligibility {
  const c = ds.customers.find((x) => x.customerId === alert.customerId)!;
  const explained = explainedRules(c);
  const unexplained = alert.hits.map((h) => h.ruleId).filter((id) => !explained.has(id));
  return {
    allowed: unexplained.length === 0,
    unexplained,
    reason: unexplained.length === 0
      ? 'Every triggered rule is covered by at least one document on file.'
      : `No document on file explains: ${unexplained.map((id) => ruleById(id).name).join('; ')}.`,
  };
}

export function validateDisposition(ds: AmlDataset, alert: Alert, input: DispositionInput): string[] {
  const errors: string[] = [];
  if (!DISPOSITIONS.some((d) => d.code === input.code)) errors.push('Choose a disposition.');
  if (input.rationale.trim().length < MIN_RATIONALE_CHARS) errors.push(`Write a rationale of at least ${MIN_RATIONALE_CHARS} characters that refers to the evidence.`);
  if (input.reviewedEvidenceIds.length === 0) errors.push('Mark at least one evidence item as reviewed.');
  if (input.code === 'CLOSE_EXPLAINED_EXCEPTION') {
    const e = closeEligibility(ds, alert);
    if (!e.allowed) errors.push(`Closing is not supported: ${e.reason}`);
  }
  return errors;
}

export function buildNarrative(ds: AmlDataset, alert: Alert, evidence: EvidenceItem[], record: DispositionRecord | null, notes: { at: string; text: string }[]): string {
  const c = ds.customers.find((x) => x.customerId === alert.customerId)!;
  const label = record ? DISPOSITIONS.find((d) => d.code === record.code)!.label : 'Not yet recorded';
  const lines: string[] = [];
  lines.push('SIMULATION — SYNTHETIC DATA — NOT A REGULATORY REPORT');
  lines.push('Portfolio demonstration by Gabriel Olatundun. All people, businesses, accounts and transactions are fictional.');
  lines.push('Alerts and risk indicators require professional review; they do not establish fraud or any regulatory conclusion.');
  lines.push('');
  lines.push(`# Case narrative — ${alert.caseId}`);
  lines.push('');
  lines.push(`- Alert: ${alert.alertId} (created ${alert.createdOn})`);
  lines.push(`- Customer: ${c.name} (${c.customerId}, ${c.type}, ${c.segment.replace('_', ' ')})`);
  lines.push(`- Account: ${c.accountId}`);
  lines.push(`- Risk score: ${alert.score}/100 (${alert.band}) — ${alert.scoreBreakdown.map((b) => `${b.label} +${b.points}`).join('; ')}`);
  lines.push(`- Disposition: ${label}`);
  lines.push('');
  lines.push('## Customer profile (KYC-related information on file)');
  lines.push(`${c.name} declared "${c.activity}" with the purpose "${c.accountPurpose}", expected credits of about $${c.declaredMonthlyTurnover.toLocaleString('en-CA')} and about ${c.expectedMonthlyTxCount} transactions per month. KYC status: ${c.kycStatus.replace('_', ' ')} (last review ${c.kycLastReview}). Risk rating ${c.riskRating}${c.riskFactors.length ? ` based on: ${c.riskFactors.join('; ')}` : ''}.`);
  lines.push('');
  lines.push('## Why the alert was generated');
  for (const h of alert.hits) lines.push(`- ${ruleById(h.ruleId).name} (${h.ruleId}): ${h.explanation}`);
  lines.push('');
  lines.push('## Evidence reviewed');
  for (const e of evidence) {
    const reviewed = record?.reviewedEvidenceIds.includes(e.id);
    lines.push(`- ${e.title}${record ? (reviewed ? ' [reviewed]' : ' [not marked reviewed]') : ''}: ${e.summary}`);
    for (const d of e.details) lines.push(`  - ${d}`);
  }
  if (notes.length) {
    lines.push('');
    lines.push('## Case notes');
    for (const n of notes) lines.push(`- ${n.at}: ${n.text}`);
  }
  lines.push('');
  lines.push('## Analyst decision and rationale');
  if (record) {
    lines.push(`Decision: ${label} — recorded ${record.recordedAt} by ${record.analyst}.`);
    lines.push('');
    lines.push(record.rationale.trim());
  } else {
    lines.push('No disposition has been recorded yet.');
  }
  lines.push('');
  lines.push('## Limitations');
  lines.push('Rule thresholds are illustrative and not calibrated on real data. This simulation does not apply any regulator’s requirements and does not determine whether conduct is unlawful; any reporting decision belongs to a qualified compliance function.');
  return lines.join('\n');
}
