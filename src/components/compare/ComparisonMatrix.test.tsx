import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ComparisonMatrix } from './ComparisonMatrix'
import type { SavedScenario } from '../../logic/types'
import type { ComputedScenarioMetrics } from '../../logic/ScenarioComparison'
import { COMPARISON_METRICS_CONFIG, COMPARISON_GROUPS } from '../../logic/comparisonConfig'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeScenario(id: string, name: string): SavedScenario {
  return {
    schemaVersion: 1, id, name,
    createdAt: new Date('2025-01-15').toISOString(),
    inputs: {
      approvedLoanAmount: 1_000_000, loanRate: 6.05, minLvr: 0.80,
      loanTermYears: 30, propertyValue: 800_000, depositRequired: 0.20,
      savings: 200_000, monthlyBudget: 6_000, isFirstHomeBuyer: false,
      propertyType: 'apartment', areaSize: 'medium', buildingAge: 'recent',
      suburbArea: 'hills', enabledSpendingIds: [], customSpendings: [],
      growthRateOverride: 5.0, currentRent: 0, renovationMonths: 0, cpiRate: 3.5,
    },
  }
}

function makeMetrics(overrides: Partial<ComputedScenarioMetrics> = {}): ComputedScenarioMetrics {
  return {
    propertyValue: 800_000, loanAmount: 640_000, lvr: 80, stampDuty: 30_000,
    upfrontCashRequired: 190_000, remainingOffsetMonth1: 5_000,
    monthlyCashBurn: 4_500, renovationGapMonths: 0,
    year5: { propertyValue: 1_020_000, loanBalance: 590_000, netEquity: 280_000, usableEquity: 226_000 },
    year10: { propertyValue: 1_300_000, loanBalance: 530_000, netEquity: 520_000, usableEquity: 510_000 },
    totalInterestPaid: 380_000, totalHoldingCosts: 95_000, totalSunkCosts: 475_000,
    usableEquityTrajectory: Array(120).fill(100_000) as number[],
    ...overrides,
  }
}

const SC_A = makeScenario('sc-a', 'Scenario Alpha')
const SC_B = makeScenario('sc-b', 'Scenario Beta')

// ─── Suite 1: Empty state ─────────────────────────────────────────────────────

describe('ComparisonMatrix — empty state', () => {
  it('renders empty-state message when no scenarios provided', () => {
    render(<ComparisonMatrix scenarios={[]} metricsMap={new Map()} />)
    expect(screen.getByText(/select at least one scenario/i)).toBeDefined()
  })
})

// ─── Suite 2: Column headers ──────────────────────────────────────────────────

describe('ComparisonMatrix — column headers', () => {
  it('renders one column header per scenario', () => {
    const map = new Map([[SC_A.id, makeMetrics()], [SC_B.id, makeMetrics()]])
    render(<ComparisonMatrix scenarios={[SC_A, SC_B]} metricsMap={map} />)
    expect(screen.getByText('Scenario Alpha')).toBeDefined()
    expect(screen.getByText('Scenario Beta')).toBeDefined()
  })
})

// ─── Suite 3: Group headers ───────────────────────────────────────────────────

describe('ComparisonMatrix — group headers', () => {
  it('renders all three group labels', () => {
    const map = new Map([[SC_A.id, makeMetrics()]])
    render(<ComparisonMatrix scenarios={[SC_A]} metricsMap={map} />)
    for (const group of COMPARISON_GROUPS) {
      expect(screen.getByText(group.label)).toBeDefined()
    }
  })
})

// ─── Suite 4: Metric rows ─────────────────────────────────────────────────────

describe('ComparisonMatrix — metric row labels', () => {
  it('renders a row for every metric in COMPARISON_METRICS_CONFIG', () => {
    const map = new Map([[SC_A.id, makeMetrics()]])
    render(<ComparisonMatrix scenarios={[SC_A]} metricsMap={map} />)
    for (const metric of COMPARISON_METRICS_CONFIG) {
      // Split the label on any non-alpha/digit/space characters (emoji,
      // dashes, special punctuation) and verify that every meaningful word
      // segment appears somewhere in the document.
      const words = metric.label
        .split(/[\s\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}\u{2014}\u{2013}—–]/gu)
        .map((w) => w.trim())
        .filter((w) => w.length > 2)  // ignore short filler words
      for (const word of words) {
        const found = document.body.textContent?.includes(word)
        expect(found, `Expected to find word "${word}" (from label "${metric.label}") in document`).toBe(true)
      }
    }
  })
})

// ─── Suite 5: Winner highlighting ────────────────────────────────────────────

describe('ComparisonMatrix — winner highlighting', () => {
  it('applies winner class to higher usable equity cell at Y10', () => {
    const mA = makeMetrics({ year10: { propertyValue: 1_200_000, loanBalance: 540_000, netEquity: 400_000, usableEquity: 420_000 } })
    const mB = makeMetrics({ year10: { propertyValue: 1_300_000, loanBalance: 520_000, netEquity: 500_000, usableEquity: 520_000 } })
    const map = new Map([[SC_A.id, mA], [SC_B.id, mB]])
    render(<ComparisonMatrix scenarios={[SC_A, SC_B]} metricsMap={map} />)
    const badges = document.querySelectorAll('.comparison-matrix__cell-win-badge')
    expect(badges.length).toBeGreaterThan(0)
  })

  it('applies winner class to cell with lower upfront cash (isHigherBetter=false)', () => {
    const mA = makeMetrics({ upfrontCashRequired: 200_000 })
    const mB = makeMetrics({ upfrontCashRequired: 150_000 }) // lower = wins
    const map = new Map([[SC_A.id, mA], [SC_B.id, mB]])
    render(<ComparisonMatrix scenarios={[SC_A, SC_B]} metricsMap={map} />)
    expect(document.querySelectorAll('.comparison-matrix__cell--winner').length).toBeGreaterThan(0)
  })

  it('shows no winner badges when both scenarios have identical values', () => {
    const same = makeMetrics()
    const map = new Map([[SC_A.id, same], [SC_B.id, same]])
    render(<ComparisonMatrix scenarios={[SC_A, SC_B]} metricsMap={map} />)
    expect(document.querySelectorAll('.comparison-matrix__cell-win-badge').length).toBe(0)
  })
})

// ─── Suite 6: --col-count CSS custom property ─────────────────────────────────

describe('ComparisonMatrix — col-count style variable', () => {
  it('sets --col-count to the number of selected scenarios', () => {
    const map = new Map([[SC_A.id, makeMetrics()], [SC_B.id, makeMetrics()]])
    const { container } = render(<ComparisonMatrix scenarios={[SC_A, SC_B]} metricsMap={map} />)
    const el = container.querySelector('.comparison-matrix') as HTMLElement
    expect(el?.style.getPropertyValue('--col-count')).toBe('2')
  })
})
