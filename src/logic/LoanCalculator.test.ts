import { describe, it, expect } from 'vitest'
import {
  calculateMonthlyRepayment,
  calculateLVR,
  calculateOffsetBalance,
  calculateRepaymentSummary,
} from './LoanCalculator'

describe('calculateMonthlyRepayment', () => {
  it('returns 0 for zero or negative principal', () => {
    expect(calculateMonthlyRepayment(0, 6.0, 30)).toBe(0)
    expect(calculateMonthlyRepayment(-1000, 6.0, 30)).toBe(0)
  })

  it('returns 0 for zero or negative term', () => {
    expect(calculateMonthlyRepayment(100000, 6.0, 0)).toBe(0)
    expect(calculateMonthlyRepayment(100000, 6.0, -1)).toBe(0)
  })

  it('calculates correct monthly repayment for standard loan', () => {
    // $300,000 at 6% for 30 years
    // Expected: ~$1,798.65
    const result = calculateMonthlyRepayment(300000, 6.0, 30)
    expect(result).toBeCloseTo(1798.65, 0.01)
  })

  it('calculates correctly when interest rate is 0', () => {
    // $300,000 at 0% for 30 years = $300,000 / 360 months = $833.33
    const result = calculateMonthlyRepayment(300000, 0, 30)
    expect(result).toBeCloseTo(833.33, 0.01)
  })

  it('calculates for small loan', () => {
    // $50,000 at 5% for 5 years = 60 months
    const result = calculateMonthlyRepayment(50000, 5.0, 5)
    expect(result).toBeGreaterThan(0)
  })
})

describe('calculateLVR', () => {
  it('returns 0 for zero or negative property value', () => {
    expect(calculateLVR(100000, 0)).toBe(0)
    expect(calculateLVR(100000, -100000)).toBe(0)
  })

  it('returns correct LVR for standard case', () => {
    // $200,000 loan on $500,000 property = 40%
    expect(calculateLVR(200000, 500000)).toBe(40)
  })

  it('returns 100% for loan equal to property value', () => {
    expect(calculateLVR(500000, 500000)).toBe(100)
  })

  it('returns over 100% for loan greater than property value', () => {
    expect(calculateLVR(600000, 500000)).toBe(120)
  })
})

describe('calculateOffsetBalance', () => {
  it('calculates correct offset balance', () => {
    // Savings: $50,000, Property: $700,000, Loan: $665,000, Duty: $15,000
    // Equity = 700,000 - 665,000 = 35,000
    // Offset = 50,000 - 35,000 - 15,000 = 0
    const result = calculateOffsetBalance(50000, 700000, 665000, 15000)
    expect(result).toBe(0)
  })

  it('returns positive when savings exceed property equity + duty', () => {
    const result = calculateOffsetBalance(100000, 700000, 665000, 15000)
    expect(result).toBe(50000) // 100,000 - 35,000 - 15,000 = 50,000
  })

  it('returns negative when savings are less than equity + duty', () => {
    const result = calculateOffsetBalance(20000, 700000, 665000, 15000)
    expect(result).toBe(-30000) // 20,000 - 35,000 - 15,000 = -30,000
  })
})

describe('calculateRepaymentSummary', () => {
  it('returns zeros for zero or negative loan amount', () => {
    const result = calculateRepaymentSummary(0, 1000, 6.0, 0, 0)
    expect(result.totalPayments).toBe(0)
    expect(result.totalInterest).toBe(0)
    expect(result.monthsTaken).toBe(0)
  })

  it('returns zeros for zero or negative monthly repayment', () => {
    const result = calculateRepaymentSummary(100000, 0, 6.0, 0, 0)
    expect(result.totalPayments).toBe(0)
    expect(result.totalInterest).toBe(0)
    expect(result.monthsTaken).toBe(0)
  })

  it('calculates correct totals for a loan with no offset', () => {
    // $300,000 at 6% for 30 years = ~$1,798.65/month
    // Total payments = 1,798.65 * 360 = $647,514
    // Total interest = $647,514 - $300,000 = $347,514
    const monthlyRepayment = calculateMonthlyRepayment(300000, 6.0, 30)
    const result = calculateRepaymentSummary(300000, monthlyRepayment, 6.0, 0, 0)

    expect(result.totalPayments).toBeCloseTo(monthlyRepayment * 360, 0)
    expect(result.totalInterest).toBeCloseTo(347514, -1)
    expect(result.monthsTaken).toBe(360)
  })

  it('reduces loan term when offset balance is positive', () => {
    // With offset balance, loan term should be shorter
    const monthlyRepayment = calculateMonthlyRepayment(300000, 6.0, 30)
    const resultWithOffset = calculateRepaymentSummary(
      300000,
      monthlyRepayment,
      6.0,
      50000,
      0
    )
    const resultWithoutOffset = calculateRepaymentSummary(
      300000,
      monthlyRepayment,
      6.0,
      0,
      0
    )

    expect(resultWithOffset.monthsTaken).toBeLessThan(resultWithoutOffset.monthsTaken)
  })
})