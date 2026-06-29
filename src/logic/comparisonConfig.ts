import type { ComputedScenarioMetrics } from './ScenarioComparison'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MetricFormat = 'currency' | 'months' | 'percent' | 'number'

export interface MetricConfig {
  /** Unique stable id — used as React key and for test assertions. */
  id: string
  /** Display label shown in the matrix row header. */
  label: string
  /** Optional tooltip copy shown via the ⓘ hint element. */
  hint?: string
  /** The group this metric belongs to (must match a GroupConfig id). */
  group: string
  /**
   * Pure extractor: given the computed metrics for one scenario, returns the
   * single numeric value to display and compare. Must never throw.
   */
  extract: (m: ComputedScenarioMetrics) => number
  /**
   * Determines which scenario "wins" (gets the green highlight) in this row.
   * true  → higher value is better (e.g. Usable Equity)
   * false → lower value is better (e.g. Sunk Costs)
   */
  isHigherBetter: boolean
  /** How the raw number should be formatted in the UI. */
  format: MetricFormat
  /**
   * When true the formatted value is prefixed with "−" to make it visually
   * clear the number represents an outgoing cost (even though the raw value
   * stored is positive).
   */
  negativeDisplay?: boolean
}

export interface GroupConfig {
  id: string
  label: string
  /** Emoji or symbol shown next to the group header. */
  icon: string
  /** Short descriptor rendered below the group name. */
  description: string
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export const COMPARISON_GROUPS: GroupConfig[] = [
  {
    id: 'liquidity',
    label: 'Liquidity & Survival',
    icon: '💧',
    description: 'Day 0 & Year 1 — can you make it through?',
  },
  {
    id: 'capital',
    label: 'Capital Creation',
    icon: '📈',
    description: 'Year 5 & Year 10 — how much wealth is built?',
  },
  {
    id: 'sunk',
    label: 'The Price of Ownership',
    icon: '🔥',
    description: '10-year sunk costs — the real bill.',
  },
]

// ─── Metric Config ────────────────────────────────────────────────────────────
//
// ARCHITECTURE CONTRACT
// ─────────────────────
// Adding a new metric to the comparison page requires ONE change: append an
// entry to this array. Zero JSX changes are needed anywhere — the matrix
// component maps over this array dynamically.

export const COMPARISON_METRICS_CONFIG: MetricConfig[] = [
  // ── Group A: Liquidity & Survival ─────────────────────────────────────────
  {
    id: 'upfront_cash',
    group: 'liquidity',
    label: 'Upfront Cash Required',
    hint: 'Deposit + Stamp Duty + all upgrades scheduled at settlement (month 1).',
    extract: (m) => m.upfrontCashRequired,
    isHigherBetter: false,
    format: 'currency',
    negativeDisplay: true,
  },
  {
    id: 'offset_month1',
    group: 'liquidity',
    label: 'Remaining Offset Buffer',
    hint: 'Cash remaining in your offset account after month 1 obligations.',
    extract: (m) => m.remainingOffsetMonth1,
    isHigherBetter: true,
    format: 'currency',
  },
  {
    id: 'monthly_burn',
    group: 'liquidity',
    label: 'Monthly Cash Burn',
    hint: 'Mandatory repayment + all baseline ongoing costs (pre-CPI).',
    extract: (m) => m.monthlyCashBurn,
    isHigherBetter: false,
    format: 'currency',
    negativeDisplay: true,
  },
  {
    id: 'reno_gap',
    group: 'liquidity',
    label: 'Renovation Gap',
    hint: 'Months paying both mortgage and rent during renovation (double-burn period).',
    extract: (m) => m.renovationGapMonths,
    isHigherBetter: false,
    format: 'months',
  },
  // ── Group B: Capital Creation (Year 5) ────────────────────────────────────
  {
    id: 'prop_value_y5',
    group: 'capital',
    label: 'Property Value — Year 5',
    hint: 'Projected market value at month 60 using mid-range growth rate.',
    extract: (m) => m.year5.propertyValue,
    isHigherBetter: true,
    format: 'currency',
  },
  {
    id: 'net_equity_y5',
    group: 'capital',
    label: 'Net Equity — Year 5',
    hint: 'Property Value − Loan Balance − all costs incurred to date.',
    extract: (m) => m.year5.netEquity,
    isHigherBetter: true,
    format: 'currency',
  },
  {
    id: 'usable_equity_y5',
    group: 'capital',
    label: 'Usable Equity 🎯 — Year 5',
    hint: '(Property Value × 80%) − Loan Balance. The amount you can actually borrow against.',
    extract: (m) => m.year5.usableEquity,
    isHigherBetter: true,
    format: 'currency',
  },
  // ── Group B: Capital Creation (Year 10) ───────────────────────────────────
  {
    id: 'prop_value_y10',
    group: 'capital',
    label: 'Property Value — Year 10',
    hint: 'Projected market value at month 120 using mid-range growth rate.',
    extract: (m) => m.year10.propertyValue,
    isHigherBetter: true,
    format: 'currency',
  },
  {
    id: 'net_equity_y10',
    group: 'capital',
    label: 'Net Equity — Year 10',
    hint: 'Property Value − Loan Balance − all costs incurred to date.',
    extract: (m) => m.year10.netEquity,
    isHigherBetter: true,
    format: 'currency',
  },
  {
    id: 'usable_equity_y10',
    group: 'capital',
    label: 'Usable Equity 🎯 — Year 10',
    hint: '(Property Value × 80%) − Loan Balance. The amount you can actually borrow against.',
    extract: (m) => m.year10.usableEquity,
    isHigherBetter: true,
    format: 'currency',
  },
  // ── Group C: The Price of Ownership ───────────────────────────────────────
  {
    id: 'total_interest',
    group: 'sunk',
    label: 'Total Interest Paid',
    hint: 'Cumulative interest charged over the 10-year simulation (offset-adjusted).',
    extract: (m) => m.totalInterestPaid,
    isHigherBetter: false,
    format: 'currency',
    negativeDisplay: true,
  },
  {
    id: 'total_holding',
    group: 'sunk',
    label: 'Total Holding Costs',
    hint: 'Strata + rates + maintenance + insurance + renovation rent, CPI-adjusted over 10 years.',
    extract: (m) => m.totalHoldingCosts,
    isHigherBetter: false,
    format: 'currency',
    negativeDisplay: true,
  },
  {
    id: 'total_sunk',
    group: 'sunk',
    label: 'Total Sunk Costs',
    hint: 'Total Interest + Total Holding Costs — the full decade bill.',
    extract: (m) => m.totalSunkCosts,
    isHigherBetter: false,
    format: 'currency',
    negativeDisplay: true,
  },
]

// ─── Winner-selection helper ───────────────────────────────────────────────────

/**
 * Returns the index of the winning value in an array of scenario metric values.
 *
 * Rules:
 *  - isHigherBetter → index of the maximum value.
 *  - !isHigherBetter → index of the minimum value.
 *  - If all finite values are identical there is no winner (returns -1).
 *  - NaN / non-finite values are excluded from contention.
 *
 * This function is pure and exported so it can be unit-tested independently.
 */
export function pickWinnerIndex(
  values: number[],
  isHigherBetter: boolean,
): number {
  if (values.length === 0) return -1

  const finite = values.filter(Number.isFinite)
  if (finite.length === 0) return -1

  const best = isHigherBetter ? Math.max(...finite) : Math.min(...finite)

  // No winner when every finite value is equal — a tie means no highlight.
  if (finite.every((v) => v === best)) return -1

  return values.findIndex((v) => v === best)
}
