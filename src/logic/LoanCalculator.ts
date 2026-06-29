/**
 * Calculates monthly mortgage repayment
 * @param principal - Loan amount
 * @param annualRate - Annual interest rate (percentage)
 * @param loanTermYears - Loan term in years
 * @returns Monthly repayment amount
 */
export function calculateMonthlyRepayment(
  principal: number,
  annualRate: number,
  loanTermYears: number
): number {
  if (principal <= 0) return 0
  if (loanTermYears <= 0) return 0

  const monthlyRate = annualRate / 100 / 12
  const totalPayments = loanTermYears * 12

  if (monthlyRate === 0) {
    return principal / totalPayments
  }

  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
    (Math.pow(1 + monthlyRate, totalPayments) - 1)
  )
}

/**
 * Calculates Loan-to-Value Ratio
 * @param loanAmount - Loan amount
 * @param propertyValue - Property value
 * @returns LVR as percentage
 */
export function calculateLVR(loanAmount: number, propertyValue: number): number {
  if (propertyValue <= 0) return 0
  return (loanAmount / propertyValue) * 100
}

/**
 * Calculates offset balance
 * @param savings - Current savings
 * @param propertyValue - Property value
 * @param loanAmount - Loan amount
 * @param stampDuty - Stamp duty amount
 * @returns Offset balance
 */
export function calculateOffsetBalance(
  savings: number,
  propertyValue: number,
  loanAmount: number,
  stampDuty: number
): number {
  return savings - (propertyValue - loanAmount) - stampDuty
}

/**
 * Simulates loan repayment with offset account to determine actual loan term and total interest
 * @param actualLoanAmount - The loan amount
 * @param monthlyRepayment - Monthly repayment amount
 * @param annualRate - Annual interest rate (percentage)
 * @param offsetBalance - Initial offset balance
 * @param monthlyBudget - Monthly budget for extra payments
 * @returns Object containing total payments, total interest, months taken, and final offset
 */
export function calculateRepaymentSummary(
  actualLoanAmount: number,
  monthlyRepayment: number,
  annualRate: number,
  offsetBalance: number,
  monthlyBudget: number
) {
  if (actualLoanAmount <= 0 || monthlyRepayment <= 0) {
    return {
      totalPayments: 0,
      totalInterest: 0,
      monthsTaken: 0,
      finalOffset: offsetBalance,
    }
  }

  let currentLoan = actualLoanAmount
  let currentOffset = offsetBalance
  const monthlyRate = annualRate / 100 / 12
  let totalInterest = 0
  let monthsTaken = 0
  let totalPayments = 0

  // If offset balance is positive, reduce loan effectively
  let effectiveLoan = currentLoan - currentOffset
  if (effectiveLoan < 0) {
    currentOffset = Math.abs(effectiveLoan)
    effectiveLoan = 0
  }

  while (effectiveLoan > 0 && monthsTaken < 600) {
    // Apply interest on effective loan
    const interestCharge = effectiveLoan * monthlyRate
    totalInterest += interestCharge

    // Calculate payment toward principal
    let principalPayment = monthlyRepayment - interestCharge

    // Check if we can pay off the loan this month
    if (effectiveLoan <= principalPayment) {
      principalPayment = effectiveLoan
      effectiveLoan = 0
    } else {
      effectiveLoan -= principalPayment
    }

    totalPayments += monthlyRepayment
    monthsTaken++

    // Apply extra payments from offset if available
    if (currentOffset > 0) {
      const extraPayment = Math.min(currentOffset, monthlyBudget)
      const extraPrincipal = extraPayment - (monthlyRepayment - principalPayment)

      if (extraPrincipal > 0) {
        effectiveLoan -= extraPrincipal
        currentOffset -= extraPayment
      }
    }
  }

  return {
    totalPayments,
    totalInterest,
    monthsTaken,
    finalOffset: Math.max(0, currentOffset),
  }
}