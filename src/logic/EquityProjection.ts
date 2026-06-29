import type {
  SpendingItem, GrowthRates, EquitySnapshot,
  EquityForecast, FinancialHealthWarning,
} from './types'

const USABLE_EQUITY_LVR = 0.80
const SIMULATION_MONTHS = 120
const BUFFER_MONTHS_DANGER = 3
const BUFFER_MONTHS_WARNING = 6
const LVR_WARNING_THRESHOLD = 90
const LVR_DANGER_THRESHOLD = 95
const COST_RATIO_WARNING = 0.35

/** Converts a SpendingItem to its monthly amount. Once-off returns 0. */
export function toMonthlyAmount(item: Pick<SpendingItem, 'frequency' | 'amount'>): number {
  if (item.frequency === 'monthly') return item.amount
  if (item.frequency === 'annual') return item.amount / 12
  return 0
}

function buildOneOffSchedule(items: SpendingItem[]): Map<number, number> {
  const m = new Map<number, number>()
  for (const item of items) {
    const mo = item.executionMonth ?? 1
    m.set(mo, (m.get(mo) ?? 0) + item.amount)
  }
  return m
}

function cpiAdjusted(base: number, yearIdx: number, cpiRate: number): number {
  return yearIdx === 0 || cpiRate === 0 ? base : base * Math.pow(1 + cpiRate / 100, yearIdx)
}

export interface ForecastParams {
  propertyValue: number
  loanAmount: number
  annualRate: number
  initialOffsetBalance: number
  monthlyRepayment: number
  monthlyBudget: number
  wageGrowthRate: number
  ongoingItems: SpendingItem[]
  oneOffItems: SpendingItem[]
  growthRates: GrowthRates
  cpiRate: number
  currentRent: number
  renovationMonths: number
  isNewBuild: boolean
}

function runSimulation(params: ForecastParams, annualGrowthRate: number): { year5: EquitySnapshot; year10: EquitySnapshot } {
  const { propertyValue, loanAmount, annualRate, initialOffsetBalance, monthlyRepayment, monthlyBudget, wageGrowthRate, ongoingItems, oneOffItems, cpiRate, currentRent, renovationMonths, isNewBuild } = params
  const monthlyRate = annualRate / 100 / 12
  let monthlyGrowthRate = annualGrowthRate / 100 / 12
  const baseMonthlyOngoing = ongoingItems.reduce((s, i) => s + toMonthlyAmount(i), 0)
  const oneOffSchedule = buildOneOffSchedule(oneOffItems)

  let loanBalance = loanAmount
  let offsetBalance = initialOffsetBalance
  let propValue = propertyValue
  let totalCosts = 0
  const snaps: Partial<{ year5: EquitySnapshot; year10: EquitySnapshot }> = {}

  for (let month = 1; month <= SIMULATION_MONTHS; month++) {
    const yearIdx = Math.floor((month - 1) / 12)

    const oneOff = oneOffSchedule.get(month) ?? 0
    if (oneOff > 0) { offsetBalance -= oneOff; totalCosts += oneOff }

    if (month <= renovationMonths && currentRent > 0) { offsetBalance -= currentRent; totalCosts += currentRent }

    const ongoing = cpiAdjusted(baseMonthlyOngoing, yearIdx, cpiRate)
    offsetBalance -= ongoing
    totalCosts += ongoing

    const effective = Math.max(loanBalance - Math.max(offsetBalance, 0), 0)
    const interest = effective * monthlyRate
    const principal = Math.max(monthlyRepayment - interest, 0)
    loanBalance = Math.max(loanBalance - principal, 0)

    // Annual Income Growth: compound the monthly budget each year
    const effectiveMonthlyBudget = monthlyBudget * Math.pow(1 + wageGrowthRate / 100, yearIdx)
    offsetBalance += effectiveMonthlyBudget - monthlyRepayment - ongoing

    // Apply growth rate with new-build depreciation penalty for first 36 months
    let effectiveGrowthRate = monthlyGrowthRate
    if (isNewBuild && month <= 36) {
      // New build depreciation drag: -2.0% p.a. during first 3 years
      effectiveGrowthRate = monthlyGrowthRate - 0.02 / 12 // NEW_BUILD_DEPRECIATION_RATE / 100 / 12
    }
    propValue *= (1 + effectiveGrowthRate)

    if (month === 60 || month === 120) {
      const year = month / 12 as 5 | 10
      const gross = propValue - loanBalance
      const snap: EquitySnapshot = {
        year, propertyValue: propValue, loanBalance,
        grossEquity: gross,
        usableEquity: propValue * USABLE_EQUITY_LVR - loanBalance,
        totalCostsIncurred: totalCosts,
        netEquityAfterCosts: gross - totalCosts,
        offsetBalance,
      }
      if (year === 5) snaps.year5 = snap
      else snaps.year10 = snap
    }
  }
  return { year5: snaps.year5!, year10: snaps.year10! }
}

/** Runs the equity simulation for low/mid/high growth scenarios. */
export function calculateEquityForecast(params: ForecastParams): EquityForecast {
  return {
    low:  { growthRate: params.growthRates.low,  ...runSimulation(params, params.growthRates.low) },
    mid:  { growthRate: params.growthRates.mid,  ...runSimulation(params, params.growthRates.mid) },
    high: { growthRate: params.growthRates.high, ...runSimulation(params, params.growthRates.high) },
  } as EquityForecast
}

export interface WarningParams {
  initialOffsetBalance: number
  monthlyRepayment: number
  baseMonthlyOngoing: number
  monthlyBudget: number
  lvr: number
  currentRent: number
  renovationMonths: number
}

/** Evaluates financial health checks, returns warnings sorted danger-first. */
export function calculateFinancialHealthWarnings(params: WarningParams): FinancialHealthWarning[] {
  const { initialOffsetBalance, monthlyRepayment, baseMonthlyOngoing, monthlyBudget, lvr, currentRent, renovationMonths } = params
  const warnings: FinancialHealthWarning[] = []
  const obligations = monthlyRepayment + baseMonthlyOngoing

  if (obligations > 0) {
    const buf = initialOffsetBalance / obligations
    if (buf < BUFFER_MONTHS_DANGER) {
      warnings.push({ type: 'insufficient_buffer', severity: 'danger', message: `Offset covers only ${buf.toFixed(1)} months — critical, below ${BUFFER_MONTHS_DANGER}-month minimum` })
    } else if (buf < BUFFER_MONTHS_WARNING) {
      warnings.push({ type: 'insufficient_buffer', severity: 'warning', message: `Offset covers ${buf.toFixed(1)} months — below ${BUFFER_MONTHS_WARNING}-month safety buffer` })
    }
  }

  if (monthlyBudget - obligations < 0) {
    warnings.push({ type: 'negative_cashflow', severity: 'danger', message: `Monthly costs exceed budget by ${Math.abs(monthlyBudget - obligations).toFixed(0)}/month` })
  }

  if (lvr > LVR_DANGER_THRESHOLD) {
    warnings.push({ type: 'high_lvr', severity: 'danger', message: `LVR is ${lvr.toFixed(1)}% — very high, LMI applies` })
  } else if (lvr > LVR_WARNING_THRESHOLD) {
    warnings.push({ type: 'high_lvr', severity: 'warning', message: `LVR is ${lvr.toFixed(1)}% — above 90%, consider LMI costs` })
  }

  if (monthlyBudget > 0 && baseMonthlyOngoing / monthlyBudget > COST_RATIO_WARNING) {
    warnings.push({ type: 'high_cost_ratio', severity: 'warning', message: `Ongoing costs are ${((baseMonthlyOngoing / monthlyBudget) * 100).toFixed(0)}% of monthly budget` })
  }

  if (renovationMonths > 0) {
    const projected = initialOffsetBalance - (obligations + currentRent) * renovationMonths
    if (projected < 0) {
      warnings.push({ type: 'renovation_double_burn', severity: 'danger', message: `Renovation holding drives offset to −${Math.abs(projected).toFixed(0)} — cash-flow negative during renovation` })
    }
  }

  return warnings.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'danger' ? -1 : 1))
}
