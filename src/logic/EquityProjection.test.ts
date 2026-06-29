import { describe, it, expect } from 'vitest'
import type { SpendingItem } from './types'
import { calculateEquityForecast, calculateFinancialHealthWarnings, toMonthlyAmount } from './EquityProjection'

const NO_ITEMS: SpendingItem[] = []
const BASE = {
  propertyValue: 700000, loanAmount: 560000, annualRate: 6.0,
  initialOffsetBalance: 30000, monthlyRepayment: 3357, monthlyBudget: 5000,
  ongoingItems: NO_ITEMS, oneOffItems: NO_ITEMS,
  growthRates: { low: 2.0, mid: 4.0, high: 7.0 },
  cpiRate: 3.5, currentRent: 0, renovationMonths: 0,
}
const mkMonthly = (amt: number): SpendingItem => ({
  id: 'c', label: 'C', category: 'other', frequency: 'monthly',
  amount: amt, enabled: true, executionMonth: 1,
})
const mkUpgrade = (month: number): SpendingItem => ({
  id: 'u', label: 'U', category: 'upgrade', frequency: 'once',
  amount: 20000, enabled: true, executionMonth: month,
})

describe('toMonthlyAmount', () => {
  it('monthly → unchanged', () =>
    expect(toMonthlyAmount({ frequency: 'monthly', amount: 500 } as SpendingItem)).toBe(500))
  it('annual → /12', () =>
    expect(toMonthlyAmount({ frequency: 'annual', amount: 1200 } as SpendingItem)).toBeCloseTo(100))
  it('once → 0', () =>
    expect(toMonthlyAmount({ frequency: 'once', amount: 10000 } as SpendingItem)).toBe(0))
})

describe('calculateEquityForecast snapshots', () => {
  it('produces year5 and year10 for all grades', () => {
    const f = calculateEquityForecast(BASE)
    for (const g of ['low', 'mid', 'high'] as const) {
      expect(f[g].year5.year).toBe(5)
      expect(f[g].year10.year).toBe(10)
    }
  })
  it('higher growth → higher property value', () => {
    const f = calculateEquityForecast(BASE)
    expect(f.mid.year5.propertyValue).toBeGreaterThan(f.low.year5.propertyValue)
    expect(f.high.year10.propertyValue).toBeGreaterThan(f.mid.year10.propertyValue)
  })
  it('loan balance decreases over time', () => {
    const f = calculateEquityForecast(BASE)
    expect(f.mid.year10.loanBalance).toBeLessThan(f.mid.year5.loanBalance)
  })
})

describe('usableEquity = (value × 0.80) − loan', () => {
  it('year5 matches formula exactly', () => {
    const s = calculateEquityForecast(BASE).mid.year5
    expect(s.usableEquity).toBeCloseTo(s.propertyValue * 0.80 - s.loanBalance, 0)
  })
  it('year10 matches formula exactly', () => {
    const s = calculateEquityForecast(BASE).mid.year10
    expect(s.usableEquity).toBeCloseTo(s.propertyValue * 0.80 - s.loanBalance, 0)
  })
})

describe('CPI inflation on ongoing costs', () => {
  it('totalCostsIncurred year10 > year5', () => {
    const f = calculateEquityForecast({ ...BASE, ongoingItems: [mkMonthly(1000)] })
    expect(f.mid.year10.totalCostsIncurred).toBeGreaterThan(f.mid.year5.totalCostsIncurred)
  })
  it('3.5% CPI total > 0% CPI total at year10', () => {
    const a = calculateEquityForecast({ ...BASE, ongoingItems: [mkMonthly(1000)], cpiRate: 3.5 })
    const b = calculateEquityForecast({ ...BASE, ongoingItems: [mkMonthly(1000)], cpiRate: 0 })
    expect(a.mid.year10.totalCostsIncurred).toBeGreaterThan(b.mid.year10.totalCostsIncurred)
  })
})

describe('timed one-off upgrades', () => {
  it('month-1 upgrade → lower net equity than month-48 (opportunity cost)', () => {
    const early = calculateEquityForecast({ ...BASE, oneOffItems: [mkUpgrade(1)] })
    const late = calculateEquityForecast({ ...BASE, oneOffItems: [mkUpgrade(48)] })
    expect(early.mid.year10.netEquityAfterCosts).toBeLessThan(late.mid.year10.netEquityAfterCosts)
  })
  it('one-off cost in totalCostsIncurred', () => {
    const w = calculateEquityForecast({ ...BASE, oneOffItems: [mkUpgrade(1)] })
    const n = calculateEquityForecast(BASE)
    expect(w.mid.year10.totalCostsIncurred).toBeGreaterThan(n.mid.year10.totalCostsIncurred)
  })
})

describe('renovation double-burn', () => {
  it('reno rent reduces offset vs no reno', () => {
    const r = calculateEquityForecast({ ...BASE, currentRent: 2500, renovationMonths: 3 })
    const n = calculateEquityForecast(BASE)
    expect(r.mid.year10.offsetBalance).toBeLessThan(n.mid.year10.offsetBalance)
  })
  it('zero renovationMonths → rent has no effect', () => {
    const a = calculateEquityForecast({ ...BASE, currentRent: 2500, renovationMonths: 0 })
    expect(a.mid.year5.grossEquity).toBeCloseTo(calculateEquityForecast(BASE).mid.year5.grossEquity, -1)
  })
})

describe('calculateFinancialHealthWarnings', () => {
  const W = {
    initialOffsetBalance: 30000, monthlyRepayment: 3357,
    baseMonthlyOngoing: 0, monthlyBudget: 5000,
    lvr: 80, currentRent: 0, renovationMonths: 0,
  }
  it('no warnings when healthy (large offset)', () =>
    expect(calculateFinancialHealthWarnings({ ...W, initialOffsetBalance: 100000 })).toHaveLength(0))
  it('insufficient_buffer warning when offset < 6 months obligations', () => {
    expect(calculateFinancialHealthWarnings({ ...W, initialOffsetBalance: 15000 })
      .map((x) => x.type)).toContain('insufficient_buffer')
  })
  it('insufficient_buffer danger when offset < 3 months', () => {
    expect(calculateFinancialHealthWarnings({ ...W, initialOffsetBalance: 5000 })
      .find((x) => x.type === 'insufficient_buffer')!.severity).toBe('danger')
  })
  it('negative_cashflow danger when budget < repayment', () => {
    expect(calculateFinancialHealthWarnings({ ...W, monthlyBudget: 2000 })
      .find((x) => x.type === 'negative_cashflow')!.severity).toBe('danger')
  })
  it('high_lvr warning >90%, danger >95%', () => {
    expect(calculateFinancialHealthWarnings({ ...W, lvr: 92 })
      .find((x) => x.type === 'high_lvr')!.severity).toBe('warning')
    expect(calculateFinancialHealthWarnings({ ...W, lvr: 96 })
      .find((x) => x.type === 'high_lvr')!.severity).toBe('danger')
  })
  it('high_cost_ratio warning when ongoing > 35% of budget', () => {
    expect(calculateFinancialHealthWarnings({ ...W, monthlyBudget: 5000, baseMonthlyOngoing: 2000 })
      .map((x) => x.type)).toContain('high_cost_ratio')
  })
  it('renovation_double_burn danger when reno drives offset below zero', () => {
    // 3357 + 2000 = 5357/mo × 3mo = 16071 > 10000 offset
    expect(calculateFinancialHealthWarnings({
      ...W, initialOffsetBalance: 10000, currentRent: 2000, renovationMonths: 3,
    }).find((x) => x.type === 'renovation_double_burn')!.severity).toBe('danger')
  })
  it('no renovation_double_burn when offset sufficient', () => {
    expect(calculateFinancialHealthWarnings({
      ...W, initialOffsetBalance: 100000, currentRent: 2000, renovationMonths: 3,
    }).map((x) => x.type)).not.toContain('renovation_double_burn')
  })
  it('warnings sorted: danger before warning', () => {
    const w = calculateFinancialHealthWarnings({ ...W, initialOffsetBalance: 5000, lvr: 92 })
    const di = w.findIndex((x) => x.severity === 'danger')
    const wi = w.findIndex((x) => x.severity === 'warning')
    if (di !== -1 && wi !== -1) expect(di).toBeLessThan(wi)
  })
})
