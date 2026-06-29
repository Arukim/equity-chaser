import { describe, it, expect } from 'vitest'
import type { ScenarioInputs } from './types'
import { computeScenarioComparison, COMPARISON_SIMULATION_MONTHS } from './ScenarioComparison'
import { calculateNSWStampDuty } from './StampDuty'
import { calculateMonthlyRepayment, calculateOffsetBalance, calculateLVR } from './LoanCalculator'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_INPUTS: ScenarioInputs = {
  approvedLoanAmount: 1_000_000,
  loanRate: 6.05,
  minLvr: 0.80,
  loanTermYears: 30,
  propertyValue: 800_000,
  depositRequired: 0.20,
  savings: 200_000,
  monthlyBudget: 6_000,
  wageGrowthRate: 1.5,
  isFirstHomeBuyer: false,
  propertyType: 'apartment',
  areaSize: 'medium',
  buildingAge: 'recent',
  locationPrestige: 'norm',
  suburbArea: 'hills',
  enabledSpendingIds: [],
  customSpendings: [],
  growthRateOverride: null,
  currentRent: 0,
  renovationMonths: 0,
  cpiRate: 3.5,
  spendingMonths: {},
}

function derivePosition(inputs: ScenarioInputs) {
  const loanAmount = Math.min(
    inputs.propertyValue * inputs.minLvr,
    inputs.propertyValue * (1 - inputs.depositRequired),
  )
  const stampDuty = calculateNSWStampDuty(inputs.propertyValue, inputs.isFirstHomeBuyer)
  const lvr = calculateLVR(loanAmount, inputs.propertyValue)
  const offset = calculateOffsetBalance(inputs.savings, inputs.propertyValue, loanAmount, stampDuty)
  const repayment = calculateMonthlyRepayment(loanAmount, inputs.loanRate, inputs.loanTermYears)
  return { loanAmount, stampDuty, lvr, offset, repayment }
}

// ─── Suite 1: Core snapshot correctness ──────────────────────────────────────

describe('computeScenarioComparison — core correctness', () => {
  it('returns year5 and year10 snapshots', () => {
    const m = computeScenarioComparison(BASE_INPUTS)
    expect(m.year5).toBeDefined()
    expect(m.year10).toBeDefined()
  })

  it('propertyValue grows: year5 > base, year10 > year5', () => {
    const m = computeScenarioComparison(BASE_INPUTS)
    expect(m.year5.propertyValue).toBeGreaterThan(BASE_INPUTS.propertyValue)
    expect(m.year10.propertyValue).toBeGreaterThan(m.year5.propertyValue)
  })

  it('loanBalance decreases: year10 < year5 < initial', () => {
    const m = computeScenarioComparison(BASE_INPUTS)
    const { loanAmount } = derivePosition(BASE_INPUTS)
    expect(m.year5.loanBalance).toBeLessThan(loanAmount)
    expect(m.year10.loanBalance).toBeLessThan(m.year5.loanBalance)
  })
})

// ─── Suite 2: Usable equity formula ──────────────────────────────────────────

describe('usableEquity = (propertyValue × 0.80) − loanBalance', () => {
  it('year5 matches formula exactly', () => {
    const m = computeScenarioComparison(BASE_INPUTS)
    expect(m.year5.usableEquity).toBeCloseTo(m.year5.propertyValue * 0.80 - m.year5.loanBalance, 0)
  })

  it('year10 matches formula exactly', () => {
    const m = computeScenarioComparison(BASE_INPUTS)
    expect(m.year10.usableEquity).toBeCloseTo(m.year10.propertyValue * 0.80 - m.year10.loanBalance, 0)
  })

  it('trajectory index 59 matches year5 usableEquity', () => {
    const m = computeScenarioComparison(BASE_INPUTS)
    expect(m.usableEquityTrajectory[59]).toBeCloseTo(m.year5.usableEquity, 0)
  })

  it('trajectory index 119 matches year10 usableEquity', () => {
    const m = computeScenarioComparison(BASE_INPUTS)
    expect(m.usableEquityTrajectory[119]).toBeCloseTo(m.year10.usableEquity, 0)
  })
})

// ─── Suite 3: Trajectory ─────────────────────────────────────────────────────

describe('usableEquityTrajectory', () => {
  it(`has exactly ${COMPARISON_SIMULATION_MONTHS} elements`, () => {
    expect(computeScenarioComparison(BASE_INPUTS).usableEquityTrajectory).toHaveLength(COMPARISON_SIMULATION_MONTHS)
  })

  it('every element is a finite number', () => {
    for (const v of computeScenarioComparison(BASE_INPUTS).usableEquityTrajectory) {
      expect(Number.isFinite(v)).toBe(true)
    }
  })
})

// ─── Suite 4: Sunk cost invariants ───────────────────────────────────────────

describe('sunk cost invariants', () => {
  it('totalSunkCosts === totalInterestPaid + totalHoldingCosts', () => {
    const m = computeScenarioComparison(BASE_INPUTS)
    expect(m.totalSunkCosts).toBeCloseTo(m.totalInterestPaid + m.totalHoldingCosts, 2)
  })

  it('totalInterestPaid > 0 when loanRate > 0', () => {
    expect(computeScenarioComparison(BASE_INPUTS).totalInterestPaid).toBeGreaterThan(0)
  })

  it('totalHoldingCosts > 0 (preset holding costs always on)', () => {
    expect(computeScenarioComparison(BASE_INPUTS).totalHoldingCosts).toBeGreaterThan(0)
  })
})

// ─── Suite 5: Upfront cash composition ───────────────────────────────────────

describe('upfrontCashRequired', () => {
  it('equals deposit + stamp duty when no month-1 upgrades', () => {
    const m = computeScenarioComparison(BASE_INPUTS)
    const { loanAmount, stampDuty } = derivePosition(BASE_INPUTS)
    const deposit = BASE_INPUTS.propertyValue - loanAmount
    expect(m.upfrontCashRequired).toBeCloseTo(deposit + stampDuty, 0)
  })

  it('includes month-1 upgrade spend (bathroom = $32k at executionMonth 1)', () => {
    const base = computeScenarioComparison(BASE_INPUTS)
    const upgraded = computeScenarioComparison({ ...BASE_INPUTS, enabledSpendingIds: ['bathroom'] })
    expect(upgraded.upfrontCashRequired).toBeCloseTo(base.upfrontCashRequired + 32_000, 0)
  })

  it('FHB stamp duty waiver reduces upfrontCashRequired for sub-$800k property', () => {
    const fhb = computeScenarioComparison({ ...BASE_INPUTS, propertyValue: 750_000, isFirstHomeBuyer: true })
    const std = computeScenarioComparison({ ...BASE_INPUTS, propertyValue: 750_000, isFirstHomeBuyer: false })
    expect(fhb.upfrontCashRequired).toBeLessThan(std.upfrontCashRequired)
  })
})

// ─── Suite 6: Monthly cash burn ───────────────────────────────────────────────

describe('monthlyCashBurn', () => {
  it('is greater than repayment alone (ongoing costs add on top)', () => {
    const m = computeScenarioComparison(BASE_INPUTS)
    const { repayment } = derivePosition(BASE_INPUTS)
    expect(m.monthlyCashBurn).toBeGreaterThan(repayment)
  })

  it('increases by $320/mo when car_running is enabled', () => {
    const base = computeScenarioComparison(BASE_INPUTS)
    const withCar = computeScenarioComparison({ ...BASE_INPUTS, enabledSpendingIds: ['car_running'] })
    expect(withCar.monthlyCashBurn).toBeCloseTo(base.monthlyCashBurn + 320, 0)
  })
})

// ─── Suite 7: Renovation gap ──────────────────────────────────────────────────

describe('renovationGapMonths', () => {
  it('is 0 when renovationMonths = 0', () => {
    expect(computeScenarioComparison(BASE_INPUTS).renovationGapMonths).toBe(0)
  })

  it('equals inputs.renovationMonths when set', () => {
    const m = computeScenarioComparison({ ...BASE_INPUTS, renovationMonths: 4, currentRent: 2_500 })
    expect(m.renovationGapMonths).toBe(4)
  })

  it('holding costs increase with renovation double-burn', () => {
    const noReno = computeScenarioComparison(BASE_INPUTS)
    const withReno = computeScenarioComparison({ ...BASE_INPUTS, renovationMonths: 3, currentRent: 2_000 })
    expect(withReno.totalHoldingCosts).toBeGreaterThan(noReno.totalHoldingCosts)
  })
})

// ─── Suite 8b: spendingMonths execution month override ───────────────────────

describe('spendingMonths — execution month override', () => {
  it('bathroom deferred to month 6 is excluded from upfrontCashRequired', () => {
    // Default: bathroom executes at month 1 → included in upfront cost.
    const defaultMonth = computeScenarioComparison({
      ...BASE_INPUTS,
      enabledSpendingIds: ['bathroom'],
      spendingMonths: {},
    })
    // Override: defer bathroom to month 6 → NOT counted in upfront.
    const deferred = computeScenarioComparison({
      ...BASE_INPUTS,
      enabledSpendingIds: ['bathroom'],
      spendingMonths: { bathroom: 6 },
    })
    // The deferred scenario should have a lower upfront cash requirement.
    expect(deferred.upfrontCashRequired).toBeLessThan(defaultMonth.upfrontCashRequired)
  })

  it('bathroom deferred to month 6 still affects offset by end of month 6', () => {
    const defaultMonth = computeScenarioComparison({
      ...BASE_INPUTS,
      enabledSpendingIds: ['bathroom'],
      spendingMonths: {},
    })
    const deferred = computeScenarioComparison({
      ...BASE_INPUTS,
      enabledSpendingIds: ['bathroom'],
      spendingMonths: { bathroom: 6 },
    })
    // After 10 years both have paid the same total holding costs (renovation spend is equal).
    // But the deferred version has better equity early on (money stayed in offset longer).
    expect(deferred.usableEquityTrajectory[5]).toBeGreaterThan(defaultMonth.usableEquityTrajectory[5])
  })

  it('empty spendingMonths produces identical results to no override', () => {
    const noOverride = computeScenarioComparison({ ...BASE_INPUTS, enabledSpendingIds: ['bathroom'] })
    const emptyOverride = computeScenarioComparison({ ...BASE_INPUTS, enabledSpendingIds: ['bathroom'], spendingMonths: {} })
    expect(noOverride.upfrontCashRequired).toBeCloseTo(emptyOverride.upfrontCashRequired, 0)
  })
})

// ─── Suite 8: Edge cases ──────────────────────────────────────────────────────

describe('edge cases', () => {
  it('does not throw for zero CPI rate', () => {
    expect(() => computeScenarioComparison({ ...BASE_INPUTS, cpiRate: 0 })).not.toThrow()
  })

  it('does not throw for growthRateOverride = 0', () => {
    expect(() => computeScenarioComparison({ ...BASE_INPUTS, growthRateOverride: 0 })).not.toThrow()
  })

  it('with growthRateOverride = 0 property value stays flat', () => {
    const m = computeScenarioComparison({ ...BASE_INPUTS, growthRateOverride: 0 })
    expect(m.year10.propertyValue).toBeCloseTo(BASE_INPUTS.propertyValue, -3)
  })

  it('does not throw for very small loan amount', () => {
    expect(() => computeScenarioComparison({
      ...BASE_INPUTS, propertyValue: 100_000, minLvr: 0, depositRequired: 1.0,
      savings: 200_000, monthlyBudget: 10_000, loanRate: 0,
    })).not.toThrow()
  })
})
