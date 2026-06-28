
import { useState, useEffect, useMemo } from 'react'
import { calculateNSWStampDuty } from './logic/StampDuty'
import './App.css'


// Custom hook to sync state with localStorage seamlessly
function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading localStorage key:', key, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error('Error setting localStorage key:', key, error);
    }
  }, [key, state]);

  return [state, setState];
}

function App() {
  // Loan inputs (approved loan amount)
  const [approvedLoanAmount, setApprovedLoanAmount] = useLocalStorage<number>('approvedLoanAmount', 1000000)
  const [loanRate, setLoanRate] = useLocalStorage<number>('loanRate', 6.05)
  const [minLvr, setMinLvr] = useLocalStorage<number>('minLvr', 0.95)
  const [loanTermYears] = useLocalStorage<number>('loanTermYears', 30)

  // Property inputs
  const [propertyValue, setPropertyValue] = useLocalStorage<number>('propertyValue', 700000)
  const [depositRequired, setDepositRequired] = useState(0.05)

  // savings details
  const [savings, setSavings] = useLocalStorage<number>('savings', 50000)
  const [monthlyBudget, setMonthlyBudget] = useLocalStorage<number>('monthlyBudget', 5000)

  const stampDuty = useMemo(() => {
    return calculateNSWStampDuty(propertyValue, true) // Assuming a first home buyer for now
  }, [propertyValue])

  // Calculate actual loan amount (what you're borrowing based on property and deposit)
  const actualLoanAmount = Math.min(propertyValue * minLvr, propertyValue - propertyValue * depositRequired);

  // Currency formatter for AUD
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Calculate LVR using approved loan amount
  const lvr = useMemo(() => {
    return (actualLoanAmount / propertyValue) * 100
  }, [actualLoanAmount, propertyValue])

  const offsetBalance = useMemo(() => {
    return savings - (propertyValue - actualLoanAmount) - stampDuty
  }, [savings, propertyValue, actualLoanAmount, stampDuty])


  // Calculate monthly repayment
  const monthlyRepayment = useMemo(() => {
    const principal = actualLoanAmount
    const annualRate = loanRate
    const monthlyRate = annualRate / 100 / 12
    const totalPayments = loanTermYears * 12

    if (monthlyRate === 0) {
      return principal / totalPayments
    }

    return (
      (principal * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
      (Math.pow(1 + monthlyRate, totalPayments) - 1)
    )
  }, [actualLoanAmount, loanRate, loanTermYears])

  // Calculate TRUE total repayments and overpayment with dynamic Offset
  const repaymentSummary = useMemo(() => {
    if (actualLoanAmount <= 0 || monthlyRepayment <= 0) {
      return { totalPayments: 0, totalInterest: 0, monthsTaken: 0, finalOffset: offsetBalance }
    }

    let currentLoan = actualLoanAmount
    let currentOffset = offsetBalance
    const monthlyRate = loanRate / 100 / 12
    let totalInterestPaid = 0
    let monthsTaken = 0
    const maxMonths = loanTermYears * 12

    // The amount left over from your budget after the mandatory bank repayment
    const monthlyOffsetContribution = monthlyBudget - monthlyRepayment

    while (currentLoan > 0 && monthsTaken < maxMonths) {
      monthsTaken++
      
      // If the offset can fully cover the remaining loan, pay it off immediately
      if (currentOffset >= currentLoan) {
        currentOffset -= currentLoan
        currentLoan = 0
        break // Stop the clock, loan is closed
      }

      // 1. Bank charges interest only on the difference (balance cannot be negative)
      const effectiveBalance = Math.max(0, currentLoan - Math.max(0, currentOffset))
      const interestThisMonth = effectiveBalance * monthlyRate
      
      totalInterestPaid += interestThisMonth

      // 2. Pay down principal (bank takes its fixed monthly repayment)
      const principalPaid = Math.min(monthlyRepayment - interestThisMonth, currentLoan)
      currentLoan -= principalPaid

      // 3. Update offset balance with your leftover budget
      currentOffset += monthlyOffsetContribution
    }

    return { 
      totalPayments: actualLoanAmount + totalInterestPaid, 
      totalInterest: totalInterestPaid,
      monthsTaken,
      finalOffset: currentOffset // Money left in your pocket after paying off the loan
    }
  }, [actualLoanAmount, offsetBalance, loanRate, loanTermYears, monthlyRepayment, monthlyBudget])

  

  return (
    <div className="container">
      <section id="center">
        <div className="hero">
          <h1>Mortgage Calculator</h1>
          <p>Calculate your repayments and overpayment</p>
        </div>

        <div className="inputs-row">
          {/* Loan Details Section */}
          <div className="inputs-section">
            <h2>Loan Details</h2>
            <div className="input-group">
              <label htmlFor="loan-amount">Loan Amount</label>
              <input
                id="loan-amount"
                type="number"
                value={approvedLoanAmount}
                onChange={(e) => setApprovedLoanAmount(Number(e.target.value))}
                placeholder="Enter loan amount"
              />
            </div>

            <div className="input-group">
              <label htmlFor="loan-rate">Interest Rate (%)</label>
              <input
                id="loan-rate"
                type="number"
                value={loanRate}
                onChange={(e) => setLoanRate(Number(e.target.value))}
                placeholder="Enter interest rate"
                step="0.01"
              />
            </div>

          <div className="input-group">
            <label htmlFor="min-lvr">Minimal LVR (%)</label>
            <input
              id="min-lvr"
              type="number"
              // Convert 0.95 to 95 for display
              value={minLvr * 100} 
              // Convert 95 back to 0.95 for state
              onChange={(e) => setMinLvr(Number(e.target.value) / 100)} 
              placeholder="Enter minimal LVR rate"
              // Step is 1% now, so users can change it by whole percent steps easily
              step="1" 
            />
          </div>
{/* 
            <div className="input-group">
              <label htmlFor="loan-term">Loan Term (Years)</label>
              <input
                id="loan-term"
                type="number"
                value={loanTermYears}
                onChange={(e) => setLoanTermYears(Number(e.target.value))}
                placeholder="Enter loan term"
              />
            </div> */}
          </div>

          {/* Property Details Section */}
          <div className="inputs-section">
            <h2>Property Details</h2>
            <div className="input-group">
              <label htmlFor="property-value">Property Value</label>
              <input
                id="property-value"
                type="number"
                value={propertyValue}
                onChange={(e) => setPropertyValue(Number(e.target.value))}
                placeholder="Enter property value"
              />
            </div>

            <div className="input-group">
              <label htmlFor="required-deposit">Required Deposit (%)</label>
              <input
                id="required-deposit"
                type="number"
                value={depositRequired * 100}
                onChange={(e) => setDepositRequired(Number(e.target.value) / 100)}
                placeholder="Enter required deposit percentage"
              />
            </div>
          </div>
            {/* Financial Details Section */}
          <div className="inputs-section">
            <h2>Financial Details</h2>
            <div className="input-group">
              <label htmlFor="savings">Current Savings</label>
              <input
                id="savings"
                type="number"
                value={savings}
                onChange={(e) => setSavings(Number(e.target.value))}
                placeholder="Enter current savings"
              />
            </div>
            <div className="input-group">
              <label htmlFor="monthly-budget">Monthly Budget</label>
              <input
                id="monthly-budget"
                type="number"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                placeholder="Enter monthly budget"
              />
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="results-section">
          <h2>Results</h2>
          <div className="result-item">
            <span className="label">Monthly Repayment:</span>
            <span className="value">{formatCurrency(monthlyRepayment)}</span>
          </div>
          <div className="result-item">
            <span className="label">Starting Offset balance:</span>
            <span className="value">{formatCurrency(offsetBalance)}</span>
          </div>
          <div className="result-item">
            <span className="label">Stamp Duty:</span>
            <span className="value">{formatCurrency(stampDuty)}</span>
          </div>
          <div className="result-item">
            <span className="label">Actual Loan Term:</span>
            <span className="value">{(repaymentSummary.monthsTaken / 12).toFixed(1)} years</span>
          </div>
          <div className="result-item">
            <span className="label">Total Interest (Overpayment):</span>
            <span className="value">{formatCurrency(repaymentSummary.totalInterest)}</span>
          </div>
          <div className="result-item">
            <span className="label">Actual Loan Amount:</span>
            <span className="value">{formatCurrency(actualLoanAmount)}</span>
          </div>
          <div className="result-item">
            <span className="label">Total Repayments:</span>
            <span className="value">{formatCurrency(repaymentSummary.totalPayments)}</span>
          </div>
          <div className="result-item">
            <span className="label">Loan-to-Value Ratio (LVR):</span>
            <span className="value">{lvr.toFixed(2)}%</span>
          </div>
        </div>
     
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </div>
  )
}

export default App
