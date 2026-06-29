import type { ScenarioInputs, SpendingItem } from './types'
import { calculateNSWStampDuty } from './StampDuty'
import {
  calculateMonthlyRepayment,
  calculateLVR,
  calculateOffsetBalance,
} from './LoanCalculator'
import {
  getGrowthRates,
  getPresetSpendings,
  UPGRADE_CATALOGUE,
  VEHICLE_CATALOGUE,
  LIFESTYLE_CATALOGUE,
  USABLE_EQUITY_LVR,
} from './PropertyPresets'
import { toMonthlyAmount } from './EquityProjection'

const SIMULATION_MONTHS = 120

/**
 * A point-in-time snapshot used by Group B (Capital Creation) at years 5 and 10.
 */
export interface ComparisonPeriodSnapshot {
  /** Projected market value of the property at this point. */
  propertyValue: number
  /** Remaining loan balance at this point. */
  loanBalance: number
  /** Net equity = propertyValue - loanBalance - all accumulated holding/interest costs. */
  netEquity: number
  /** Usable equity = (propertyValue * 0.80) - loanBalance. */
  usableEquity: number
}

/**
 * The full set of metrics required by the Compare Scenarios page for a single
 * scenario. Pure data — no formatting, no React.
 */
export interface ComputedScenarioMetrics {
  // ── Static loan/position facts ──────────────────────────────────────────────
  propertyValue: number
  loanAmount: number
  lvr: number
  stampDuty: number

  // ── Group A: Liquidity & Survival ────────────────────────────────────────────
  /** Deposit (property - loan) + stamp duty + month-1 upgrade spend. */
  upfrontCashRequired: number
  /** Offset balance remaining after the first simulated month. */
  remainingOffsetMonth1: number
  /** Mandatory monthly repayment + base monthly ongoing costs. */
  monthlyCashBurn: number
  /** Months of renovation double-burn (mortgage + rent on old place). */
  renovationGapMonths: number

  // ── Group B: Capital Creation ────────────────────────────────────────────────
  year5: ComparisonPeriodSnapshot
  year10: ComparisonPeriodSnapshot

  // ── Group C: The Price of Ownership (10-year sunk costs) ──────────────────────
  totalInterestPaid: number
  totalHoldingCosts: number
  totalSunkCosts: number

  // ── Chart data ───────────────────────────────────────────────────────────────
  /** Usable equity for each of the 120 simulated months (index 0 = month 1). */
  usableEquityTrajectory: number[]
  /** Total (gross) equity = propertyValue − loanBalance for each of the 120 months. */
  totalEquityTrajectory: number[]
}

/**
 * Reconstructs the resolved list of spending items from saved scenario inputs.
 * Mirrors the derivation used by the dashboard (App.tsx): preset holding costs
 * are always on; catalogue items are enabled via enabledSpendingIds.
 */
function resolveSpendingItems(inputs: ScenarioInputs): SpendingItem[] {
  const presets = getPresetSpendings(
    inputs.propertyType,
    inputs.buildingAge,
    inputs.areaSize,
    inputs.propertyValue,
  )
  const catalogue: SpendingItem[] = [
    ...UPGRADE_CATALOGUE,
    ...VEHICLE_CATALOGUE,
    ...LIFESTYLE_CATALOGUE,
    ...inputs.customSpendings,
  ]
  const enabledCatalogue = catalogue
    .filter((item) => inputs.enabledSpendingIds.includes(item.id))
    .map((item) => ({
      ...item,
      enabled: true,
      executionMonth: inputs.spendingMonths[item.id] ?? item.executionMonth,
    }))

  return [...presets, ...enabledCatalogue]
}

function cpiAdjusted(base: number, yearIdx: number, cpiRate: number): number {
  return yearIdx === 0 || cpiRate === 0
    ? base
    : base * Math.pow(1 + cpiRate / 100, yearIdx)
}

/**
 * Computes every metric the Compare Scenarios page needs for one scenario.
 *
 * The simulation mirrors the dashboard's EquityProjection engine (offset-aware
 * interest, CPI-adjusted ongoing costs, renovation double-burn) but additionally
 * records the per-month usable-equity trajectory and splits sunk costs into
 * interest vs. holding components.
 */
export function computeScenarioComparison(
  inputs: ScenarioInputs,
): ComputedScenarioMetrics {
  const {
    propertyValue,
    minLvr,
    depositRequired,
    loanRate,
    loanTermYears,
    savings,
    monthlyBudget,
    isFirstHomeBuyer,
    cpiRate,
    currentRent,
    renovationMonths,
  } = inputs

  // ── Derived position (matches App.tsx) ────────────────────────────────────────
  const loanAmount = Math.min(
    propertyValue * minLvr,
    propertyValue * (1 - depositRequired),
  )
  const stampDuty = calculateNSWStampDuty(propertyValue, isFirstHomeBuyer)
  const lvr = calculateLVR(loanAmount, propertyValue)
  const initialOffset = calculateOffsetBalance(
    savings,
    propertyValue,
    loanAmount,
    stampDuty,
  )
  const monthlyRepayment = calculateMonthlyRepayment(
    loanAmount,
    loanRate,
    loanTermYears,
  )

  const growthRates = getGrowthRates(
    inputs.suburbArea,
    inputs.propertyType,
    inputs.buildingAge,
    inputs.locationPrestige,
  )
  const annualGrowthRate =
    inputs.growthRateOverride !== null ? inputs.growthRateOverride : growthRates.mid

  const items = resolveSpendingItems(inputs)
  const ongoingItems = items.filter((i) => i.enabled && i.frequency !== 'once')
  const oneOffItems = items.filter((i) => i.enabled && i.frequency === 'once')

  const baseMonthlyOngoing = ongoingItems.reduce(
    (sum, i) => sum + toMonthlyAmount(i),
    0,
  )

  // Month-1 upgrade spend that forms part of the day-0 cash requirement.
  const initialUpgradeSpend = oneOffItems
    .filter((i) => (i.executionMonth ?? 1) === 1)
    .reduce((sum, i) => sum + i.amount, 0)

  const oneOffSchedule = new Map<number, number>()
  for (const item of oneOffItems) {
    const mo = item.executionMonth ?? 1
    oneOffSchedule.set(mo, (oneOffSchedule.get(mo) ?? 0) + item.amount)
  }

  // ── Group A scalars ────────────────────────────────────────────────────────────
  const deposit = propertyValue - loanAmount
  const upfrontCashRequired = deposit + stampDuty + initialUpgradeSpend
  const monthlyCashBurn = monthlyRepayment + baseMonthlyOngoing
  const renovationGapMonths = renovationMonths

  // ── Simulation ───────────────────────────────────────────────────────────────
  const monthlyRate = loanRate / 100 / 12
  const monthlyGrowthRate = annualGrowthRate / 100 / 12

  let loanBalance = loanAmount
  let offsetBalance = initialOffset
  let propValue = propertyValue
  let totalInterestPaid = 0
  let totalHoldingCosts = 0
  let totalCostsIncurred = 0
  let remainingOffsetMonth1 = initialOffset

  const usableEquityTrajectory: number[] = []
  const totalEquityTrajectory: number[] = []
  const snapshots: { year5?: ComparisonPeriodSnapshot; year10?: ComparisonPeriodSnapshot } = {}

  for (let month = 1; month <= SIMULATION_MONTHS; month++) {
    const yearIdx = Math.floor((month - 1) / 12)

    // One-off spend (e.g. upgrades) drawn from offset on its execution month.
    const oneOff = oneOffSchedule.get(month) ?? 0
    if (oneOff > 0) {
      offsetBalance -= oneOff
      totalCostsIncurred += oneOff
    }

    // Renovation double-burn: paying rent on the old place while renovating.
    if (month <= renovationMonths && currentRent > 0) {
      offsetBalance -= currentRent
      totalCostsIncurred += currentRent
      totalHoldingCosts += currentRent
    }

    // CPI-adjusted ongoing holding costs.
    const ongoing = cpiAdjusted(baseMonthlyOngoing, yearIdx, cpiRate)
    offsetBalance -= ongoing
    totalCostsIncurred += ongoing
    totalHoldingCosts += ongoing

    // Offset-aware interest charge on the effective (net) loan balance.
    const effective = Math.max(loanBalance - Math.max(offsetBalance, 0), 0)
    const interest = effective * monthlyRate
    totalInterestPaid += interest
    totalCostsIncurred += interest

    const principal = Math.max(monthlyRepayment - interest, 0)
    loanBalance = Math.max(loanBalance - principal, 0)
    

     // Annual Income Growth: compound the monthly budget each year
     const effectiveMonthlyBudget = monthlyBudget * Math.pow(1 + inputs.wageGrowthRate / 100, yearIdx)
     offsetBalance += effectiveMonthlyBudget - monthlyRepayment - ongoing

     // Apply growth rate with new-build depreciation penalty for first 36 months
     let effectiveGrowthRate = monthlyGrowthRate
     if (inputs.buildingAge === 'new' && month <= 36) {
       effectiveGrowthRate = monthlyGrowthRate - 0.02 / 12
     }
     propValue *= 1 + effectiveGrowthRate

    const usableEquity = propValue * USABLE_EQUITY_LVR - loanBalance
    usableEquityTrajectory.push(usableEquity)
    totalEquityTrajectory.push(propValue - loanBalance + Math.max(offsetBalance, 0))

    if (month === 1) {
      remainingOffsetMonth1 = offsetBalance
    }

    if (month === 60 || month === 120) {
      const snap: ComparisonPeriodSnapshot = {
        propertyValue: propValue,
        loanBalance,
        netEquity: propValue - loanBalance - totalCostsIncurred,
        usableEquity,
      }
      if (month === 60) snapshots.year5 = snap
      else snapshots.year10 = snap
    }
  }

  const totalSunkCosts = totalInterestPaid + totalHoldingCosts

  return {
    propertyValue,
    loanAmount,
    lvr,
    stampDuty,
    upfrontCashRequired,
    remainingOffsetMonth1,
    monthlyCashBurn,
    renovationGapMonths,
    year5: snapshots.year5!,
    year10: snapshots.year10!,
    totalInterestPaid,
    totalHoldingCosts,
    totalSunkCosts,
    usableEquityTrajectory,
    totalEquityTrajectory,
  }
}

/** Exported for tests / advanced consumers. */
export const COMPARISON_SIMULATION_MONTHS = SIMULATION_MONTHS
