/**
 * Deterministic AML detection rules (educational simulation).
 *
 * Each rule is a pure function over one customer's profile and transactions. A rule hit means
 * "this pattern deserves a human look" — it is NOT a finding of fraud, money laundering or any
 * regulatory conclusion. Thresholds are illustrative and documented in RULE_CATALOG.
 */
import { addDays, daysBetween, monthOf } from '../../lib/dates';
import type { Customer, Transaction } from '../../data/aml/types';

export type RuleId =
  | 'R1_HIGH_VELOCITY'
  | 'R2_LARGE_VS_PROFILE'
  | 'R3_CASH_JUST_BELOW_THRESHOLD'
  | 'R4_INFLOW_EXCEEDS_PROFILE'
  | 'R5_DUPLICATE_POSTING'
  | 'R6_RAPID_PASS_THROUGH'
  | 'R7_PROFILE_INCONSISTENCY';

export interface RuleHit {
  ruleId: RuleId;
  /** Plain-language explanation built from the actual values that triggered the rule. */
  explanation: string;
  /** Transactions that caused the hit. */
  txIds: string[];
  /** Window the hit refers to. */
  windowStart: string;
  windowEnd: string;
  /** Measured value vs threshold, for transparency. */
  observed: number;
  threshold: number;
}

export const PARAMS = {
  R1: { windowDays: 7, multiplier: 3, minCount: 10 },
  R2: { profileMultiplier: 3, minAmount: 10_000 },
  R3: { low: 9_000, high: 9_999.99, minCount: 3, windowDays: 7 },
  R4: { multiplier: 3 },
  R5: { maxDayGap: 1 },
  R6: { minCredit: 10_000, windowDays: 2, outflowShare: 0.9 },
  R7: { minDistinctCounterparties: 3, windowDays: 30 },
} as const;

export interface RuleDefinition {
  id: RuleId;
  name: string;
  category: 'Velocity' | 'Amount' | 'Cash' | 'Profile' | 'Data quality' | 'Movement';
  weight: number;
  logic: string;
  why: string;
  limitations: string;
}

export const RULE_CATALOG: RuleDefinition[] = [
  {
    id: 'R1_HIGH_VELOCITY', name: 'Transaction frequency anomaly', category: 'Velocity', weight: 25,
    logic: `Count of transactions in any rolling ${PARAMS.R1.windowDays}-day window ≥ max(${PARAMS.R1.minCount}, ${PARAMS.R1.multiplier} × expected weekly count). Expected weekly = declared monthly count ÷ 4.33.`,
    why: 'A sudden burst far above the declared pattern can indicate account use the customer did not describe.',
    limitations: 'Legitimate events (promotions, one-off jobs) cause bursts too. Thresholds are not calibrated on real data.',
  },
  {
    id: 'R2_LARGE_VS_PROFILE', name: 'Unusual amount vs. profile', category: 'Amount', weight: 30,
    logic: `Single transaction ≥ ${PARAMS.R2.profileMultiplier} × declared monthly turnover AND ≥ $${PARAMS.R2.minAmount.toLocaleString('en-CA')}.`,
    why: 'One transaction larger than several months of expected activity is inconsistent with the profile.',
    limitations: 'Property sales, inheritances and loan proceeds are common legitimate causes; data errors (e.g. decimal shifts) also trigger it.',
  },
  {
    id: 'R3_CASH_JUST_BELOW_THRESHOLD', name: 'Repeated cash just below $10,000', category: 'Cash', weight: 45,
    logic: `≥ ${PARAMS.R3.minCount} cash deposits each between $${PARAMS.R3.low.toLocaleString('en-CA')} and $${PARAMS.R3.high.toLocaleString('en-CA')} within ${PARAMS.R3.windowDays} days.`,
    why: 'Repeated deposits just under a reporting threshold is a commonly cited indicator worth reviewing (Canada’s large cash transaction reporting threshold is $10,000).',
    limitations: 'Educational illustration only; it does not apply any regulator’s rules, aggregation logic or reporting obligations.',
  },
  {
    id: 'R4_INFLOW_EXCEEDS_PROFILE', name: 'Monthly inflow exceeds profile', category: 'Profile', weight: 20,
    logic: `Total credits in a calendar month ≥ ${PARAMS.R4.multiplier} × declared monthly turnover.`,
    why: 'Sustained volume well above what the customer declared means the profile no longer describes the account.',
    limitations: 'Seasonal businesses and outdated profiles trigger it; it carries the lowest weight for that reason.',
  },
  {
    id: 'R5_DUPLICATE_POSTING', name: 'Possible duplicate posting', category: 'Data quality', weight: 15,
    logic: `Two or more transactions on the same account with identical reference, amount, direction and counterparty within ${PARAMS.R5.maxDayGap} day.`,
    why: 'Duplicates inflate activity and can create false alerts; they can also hide in plain sight when payments are deliberately repeated.',
    limitations: 'Cannot tell a load defect from a genuinely repeated payment without lineage (batch/load run) evidence.',
  },
  {
    id: 'R6_RAPID_PASS_THROUGH', name: 'Rapid pass-through of funds', category: 'Movement', weight: 35,
    logic: `Credit ≥ $${PARAMS.R6.minCredit.toLocaleString('en-CA')} followed within ${PARAMS.R6.windowDays} days by outgoing wires to other counterparties totalling ≥ ${PARAMS.R6.outflowShare * 100}% of the credit.`,
    why: 'Funds that arrive and leave almost immediately suggest the account may be used as a conduit.',
    limitations: 'Trading businesses routinely pay suppliers soon after receiving funds; context decides.',
  },
  {
    id: 'R7_PROFILE_INCONSISTENCY', name: 'Activity inconsistent with declared purpose', category: 'Profile', weight: 30,
    logic: `Declared purpose excludes international payments AND incoming international wires from ≥ ${PARAMS.R7.minDistinctCounterparties} distinct counterparties within ${PARAMS.R7.windowDays} days.`,
    why: 'The account is being used for something the customer did not declare at onboarding.',
    limitations: 'Profiles go stale; the customer may have started legitimate freelance work abroad.',
  },
];

export const ruleById = (id: RuleId) => RULE_CATALOG.find((r) => r.id === id)!;

const fmt = (v: number) => `$${v.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function r1HighVelocity(c: Customer, txs: Transaction[]): RuleHit | null {
  const expectedWeekly = c.expectedMonthlyTxCount / 4.33;
  const threshold = Math.max(PARAMS.R1.minCount, PARAMS.R1.multiplier * expectedWeekly);
  const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
  let best: { start: string; items: Transaction[] } | null = null;
  for (const t of sorted) {
    const end = addDays(t.date, PARAMS.R1.windowDays - 1);
    const items = sorted.filter((x) => x.date >= t.date && x.date <= end);
    if (!best || items.length > best.items.length) best = { start: t.date, items };
  }
  if (!best || best.items.length < threshold) return null;
  return {
    ruleId: 'R1_HIGH_VELOCITY',
    explanation: `${best.items.length} transactions between ${best.start} and ${addDays(best.start, PARAMS.R1.windowDays - 1)}; the threshold for this customer is ${threshold.toFixed(1)} (expected ≈${expectedWeekly.toFixed(1)} per week).`,
    txIds: best.items.map((t) => t.txId),
    windowStart: best.start, windowEnd: addDays(best.start, PARAMS.R1.windowDays - 1),
    observed: best.items.length, threshold: Number(threshold.toFixed(2)),
  };
}

export function r2LargeVsProfile(c: Customer, txs: Transaction[]): RuleHit | null {
  const threshold = Math.max(PARAMS.R2.minAmount, PARAMS.R2.profileMultiplier * c.declaredMonthlyTurnover);
  const hits = txs.filter((t) => t.amount >= threshold);
  if (!hits.length) return null;
  const max = hits.reduce((m, t) => (t.amount > m.amount ? t : m));
  return {
    ruleId: 'R2_LARGE_VS_PROFILE',
    explanation: `${hits.length} transaction(s) at or above ${fmt(threshold)} — the greater of 3 × declared monthly turnover (${fmt(c.declaredMonthlyTurnover)}) and ${fmt(PARAMS.R2.minAmount)}. Largest: ${fmt(max.amount)} on ${max.date} (${max.reference}).`,
    txIds: hits.map((t) => t.txId),
    windowStart: hits[0].date, windowEnd: hits[hits.length - 1].date,
    observed: max.amount, threshold,
  };
}

export function r3CashJustBelowThreshold(_c: Customer, txs: Transaction[]): RuleHit | null {
  const cash = txs
    .filter((t) => t.channel === 'cash' && t.direction === 'credit' && t.amount >= PARAMS.R3.low && t.amount <= PARAMS.R3.high)
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const t of cash) {
    const items = cash.filter((x) => x.date >= t.date && daysBetween(t.date, x.date) < PARAMS.R3.windowDays);
    if (items.length >= PARAMS.R3.minCount) {
      const total = items.reduce((s, x) => s + x.amount, 0);
      const branches = new Set(items.map((x) => x.branch)).size;
      return {
        ruleId: 'R3_CASH_JUST_BELOW_THRESHOLD',
        explanation: `${items.length} cash deposits between ${fmt(PARAMS.R3.low)} and ${fmt(PARAMS.R3.high)} from ${items[0].date} to ${items[items.length - 1].date} at ${branches} branch(es), totalling ${fmt(total)}.`,
        txIds: items.map((x) => x.txId),
        windowStart: items[0].date, windowEnd: items[items.length - 1].date,
        observed: items.length, threshold: PARAMS.R3.minCount,
      };
    }
  }
  return null;
}

export function r4InflowExceedsProfile(c: Customer, txs: Transaction[]): RuleHit | null {
  const threshold = PARAMS.R4.multiplier * c.declaredMonthlyTurnover;
  const byMonth = new Map<string, Transaction[]>();
  for (const t of txs) if (t.direction === 'credit') byMonth.set(monthOf(t.date), [...(byMonth.get(monthOf(t.date)) ?? []), t]);
  let worst: { month: string; total: number; items: Transaction[] } | null = null;
  for (const [month, items] of byMonth) {
    const total = items.reduce((s, t) => s + t.amount, 0);
    if (total >= threshold && (!worst || total > worst.total)) worst = { month, total, items };
  }
  if (!worst) return null;
  return {
    ruleId: 'R4_INFLOW_EXCEEDS_PROFILE',
    explanation: `Credits in ${worst.month} total ${fmt(worst.total)} — ${(worst.total / c.declaredMonthlyTurnover).toFixed(1)}× the declared monthly turnover of ${fmt(c.declaredMonthlyTurnover)} (threshold ${PARAMS.R4.multiplier}×).`,
    txIds: worst.items.map((t) => t.txId),
    windowStart: `${worst.month}-01`, windowEnd: worst.items[worst.items.length - 1].date,
    observed: Number(worst.total.toFixed(2)), threshold,
  };
}

export function r5DuplicatePosting(_c: Customer, txs: Transaction[]): RuleHit | null {
  const groups = new Map<string, Transaction[]>();
  for (const t of txs) {
    const key = [t.accountId, t.reference, t.amount.toFixed(2), t.direction, t.counterparty].join('|');
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const dupGroups = [...groups.values()].filter((g) => g.length > 1 && daysBetween(g[0].date, g[g.length - 1].date) <= PARAMS.R5.maxDayGap);
  if (!dupGroups.length) return null;
  const ids = dupGroups.flat().map((t) => t.txId);
  const refs = dupGroups.map((g) => `${g[0].reference} ×${g.length}`).join(', ');
  return {
    ruleId: 'R5_DUPLICATE_POSTING',
    explanation: `${dupGroups.length} group(s) of identical postings (same reference, amount, direction and counterparty): ${refs}.`,
    txIds: ids,
    windowStart: dupGroups[0][0].date, windowEnd: dupGroups[dupGroups.length - 1][0].date,
    observed: dupGroups.length, threshold: 1,
  };
}

export function r6RapidPassThrough(_c: Customer, txs: Transaction[]): RuleHit | null {
  const credits = txs.filter((t) => t.direction === 'credit' && t.amount >= PARAMS.R6.minCredit).sort((a, b) => a.date.localeCompare(b.date));
  const matched: { credit: Transaction; outs: Transaction[]; share: number }[] = [];
  for (const cr of credits) {
    const outs = txs.filter(
      (t) => t.direction === 'debit' && t.channel.startsWith('wire') && t.counterparty !== cr.counterparty &&
        t.date >= cr.date && daysBetween(cr.date, t.date) <= PARAMS.R6.windowDays,
    );
    const share = outs.reduce((s, t) => s + t.amount, 0) / cr.amount;
    if (share >= PARAMS.R6.outflowShare) matched.push({ credit: cr, outs, share });
  }
  if (!matched.length) return null;
  const top = matched.reduce((m, x) => (x.share > m.share ? x : m));
  return {
    ruleId: 'R6_RAPID_PASS_THROUGH',
    explanation: `${matched.length} credit(s) were followed within ${PARAMS.R6.windowDays} days by outgoing wires of ≥${PARAMS.R6.outflowShare * 100}% of the amount. Example: ${fmt(top.credit.amount)} received ${top.credit.date}, ${(top.share * 100).toFixed(1)}% sent out to ${[...new Set(top.outs.map((o) => o.counterparty))].join(', ')}.`,
    txIds: [...new Set(matched.flatMap((m) => [m.credit.txId, ...m.outs.map((o) => o.txId)]))],
    windowStart: matched[0].credit.date, windowEnd: addDays(matched[matched.length - 1].credit.date, PARAMS.R6.windowDays),
    observed: Number(top.share.toFixed(3)), threshold: PARAMS.R6.outflowShare,
  };
}

export function r7ProfileInconsistency(c: Customer, txs: Transaction[]): RuleHit | null {
  if (c.internationalExpected) return null;
  const intl = txs.filter((t) => t.direction === 'credit' && t.channel === 'wire_international').sort((a, b) => a.date.localeCompare(b.date));
  for (const t of intl) {
    const items = intl.filter((x) => x.date >= t.date && daysBetween(t.date, x.date) < PARAMS.R7.windowDays);
    const distinct = new Set(items.map((x) => x.counterparty));
    if (distinct.size >= PARAMS.R7.minDistinctCounterparties) {
      return {
        ruleId: 'R7_PROFILE_INCONSISTENCY',
        explanation: `Declared purpose is “${c.accountPurpose}”, which does not include international payments, yet ${items.length} incoming international wires from ${distinct.size} different counterparties arrived between ${items[0].date} and ${items[items.length - 1].date}.`,
        txIds: items.map((x) => x.txId),
        windowStart: items[0].date, windowEnd: items[items.length - 1].date,
        observed: distinct.size, threshold: PARAMS.R7.minDistinctCounterparties,
      };
    }
  }
  return null;
}

export const RULES: Record<RuleId, (c: Customer, txs: Transaction[]) => RuleHit | null> = {
  R1_HIGH_VELOCITY: r1HighVelocity,
  R2_LARGE_VS_PROFILE: r2LargeVsProfile,
  R3_CASH_JUST_BELOW_THRESHOLD: r3CashJustBelowThreshold,
  R4_INFLOW_EXCEEDS_PROFILE: r4InflowExceedsProfile,
  R5_DUPLICATE_POSTING: r5DuplicatePosting,
  R6_RAPID_PASS_THROUGH: r6RapidPassThrough,
  R7_PROFILE_INCONSISTENCY: r7ProfileInconsistency,
};

export function evaluateCustomer(c: Customer, txs: Transaction[]): RuleHit[] {
  return (Object.keys(RULES) as RuleId[]).map((id) => RULES[id](c, txs)).filter((h): h is RuleHit => h !== null);
}
