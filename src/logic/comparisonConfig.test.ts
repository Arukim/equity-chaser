import { describe, it, expect } from 'vitest'
import type { ScenarioInputs } from './types'
import { computeScenarioComparison } from './ScenarioComparison'
import {
  COMPARISON_METRICS_CONFIG,
  COMPARISON_GROUPS,
  pickWinnerIndex,
} from './comparisonConfig'

// ─── Fixture ──────────────────────────────────────────────────────────────────

const FIXTURE_INPUTS: ScenarioInputs = {
  approvedLoanAmount: 1_000_000,
  loanRate: 6.05,
  minLvr: 0.80,
  loanTermYears: 30,
  propertyValue: 800_000,
  depositRequired: 0.20,
  savings: 200_000,
  monthlyBudget: 6_000,
  isFirstHomeBuyer: false,
  propertyType: 'apartment',
  areaSize: 'medium',
  buildingAge: 'recent',
  suburbArea: 'hills',
  enabledSpendingIds: [],
  customSpendings: [],
  growthRateOverride: 5.0,
  currentRent: 0,
  renovationMonths: 0,
  cpiRate: 3.5,
}

const FIXTURE_METRICS = computeScenarioComparison(FIXTURE_INPUTS)

// ─── Suite 1: Config completeness ────────────────────────────────────────────

describe('COMPARISON_METRICS_CONFIG completeness', () => {
  it('every metric has a non-empty id, label, and group', () => {
    for (const m of COMPARISON_METRICS_CONFIG) {
      expect(m.id.length).toBeGreaterThan(0)
      expect(m.label.length).toBeGreaterThan(0)
      expect(m.group.length).toBeGreaterThan(0)
    }
  })

  it('every metric group references a known GroupConfig id', () => {
    const groupIds = new Set(COMPARISON_GROUPS.map((g) => g.id))
    for (const m of COMPARISON_METRICS_CONFIG) {
      expect(groupIds.has(m.group)).toBe(true)
    }
  })

  it('every metric id is unique', () => {
    const ids = COMPARISON_METRICS_CONFIG.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // Guard against accidental removal of required metric ids.
  const REQUIRED_IDS = [
    'upfront_cash', 'offset_month1', 'monthly_burn', 'reno_gap',
    'prop_value_y5', 'net_equity_y5', 'usable_equity_y5',
    'prop_value_y10', 'net_equity_y10', 'usable_equity_y10',
    'total_interest', 'total_holding', 'total_sunk',
  ]

  for (const id of REQUIRED_IDS) {
    it(`contains required metric "${id}"`, () => {
      expect(COMPARISON_METRICS_CONFIG.some((m) => m.id === id)).toBe(true)
    })
  }
})

// ─── Suite 2: Extractors return finite numbers ────────────────────────────────

describe('COMPARISON_METRICS_CONFIG extractors', () => {
  for (const metric of COMPARISON_METRICS_CONFIG) {
    it(`"${metric.id}" extract returns a finite number for the fixture`, () => {
      const value = metric.extract(FIXTURE_METRICS)
      expect(Number.isFinite(value)).toBe(true)
    })
  }
})

// ─── Suite 3: isHigherBetter semantics ───────────────────────────────────────

describe('COMPARISON_METRICS_CONFIG isHigherBetter semantics', () => {
  it('upfront_cash, monthly_burn, reno_gap, total_* are lower-better (isHigherBetter=false)', () => {
    const lowerBetter = ['upfront_cash', 'monthly_burn', 'reno_gap', 'total_interest', 'total_holding', 'total_sunk']
    for (const id of lowerBetter) {
      const m = COMPARISON_METRICS_CONFIG.find((x) => x.id === id)!
      expect(m.isHigherBetter).toBe(false)
    }
  })

  it('offset_month1, all equity/value metrics are higher-better (isHigherBetter=true)', () => {
    const higherBetter = [
      'offset_month1',
      'prop_value_y5', 'net_equity_y5', 'usable_equity_y5',
      'prop_value_y10', 'net_equity_y10', 'usable_equity_y10',
    ]
    for (const id of higherBetter) {
      const m = COMPARISON_METRICS_CONFIG.find((x) => x.id === id)!
      expect(m.isHigherBetter).toBe(true)
    }
  })
})

// ─── Suite 4: pickWinnerIndex ─────────────────────────────────────────────────

describe('pickWinnerIndex', () => {
  it('returns index of maximum for isHigherBetter=true', () => {
    expect(pickWinnerIndex([100, 300, 200], true)).toBe(1)
  })

  it('returns index of minimum for isHigherBetter=false', () => {
    expect(pickWinnerIndex([100, 300, 200], false)).toBe(0)
  })

  it('returns -1 when all values are equal (tie = no winner)', () => {
    expect(pickWinnerIndex([500, 500, 500], true)).toBe(-1)
    expect(pickWinnerIndex([500, 500, 500], false)).toBe(-1)
  })

  it('returns -1 for empty array', () => {
    expect(pickWinnerIndex([], true)).toBe(-1)
    expect(pickWinnerIndex([], false)).toBe(-1)
  })

  it('returns -1 when all values are NaN', () => {
    expect(pickWinnerIndex([NaN, NaN], true)).toBe(-1)
  })

  it('ignores NaN entries and picks winner from finite values', () => {
    // [NaN, 200, 100] → isHigherBetter=true → winner is index 1
    expect(pickWinnerIndex([NaN, 200, 100], true)).toBe(1)
  })

  it('returns -1 for single-element array (no contest)', () => {
    expect(pickWinnerIndex([42], true)).toBe(-1)
  })

  it('handles negative values correctly for isHigherBetter=false', () => {
    // Lower is better: -500 wins over -100
    expect(pickWinnerIndex([-500, -100, -300], false)).toBe(0)
  })

  it('handles negative values correctly for isHigherBetter=true', () => {
    // Higher is better: -100 wins over -500
    expect(pickWinnerIndex([-500, -100, -300], true)).toBe(1)
  })

  it('ignores Infinity values — finite values still compete normally', () => {
    // Infinity is non-finite, so the winner is the largest finite value (200 at index 1).
    expect(pickWinnerIndex([Infinity, 200, 100], true)).toBe(1)
  })

  it('returns -1 when all values are Infinity (no finite values to compare)', () => {
    expect(pickWinnerIndex([Infinity, Infinity], true)).toBe(-1)
  })
})

// ─── Suite 5: Groups config ───────────────────────────────────────────────────

describe('COMPARISON_GROUPS', () => {
  it('contains exactly 3 groups: liquidity, capital, sunk', () => {
    const ids = COMPARISON_GROUPS.map((g) => g.id)
    expect(ids).toContain('liquidity')
    expect(ids).toContain('capital')
    expect(ids).toContain('sunk')
    expect(COMPARISON_GROUPS).toHaveLength(3)
  })

  it('every group has a non-empty label, icon, and description', () => {
    for (const g of COMPARISON_GROUPS) {
      expect(g.label.length).toBeGreaterThan(0)
      expect(g.icon.length).toBeGreaterThan(0)
      expect(g.description.length).toBeGreaterThan(0)
    }
  })
})
