import { useState, useMemo } from 'react'
import './App.css'

function App() {
  // Loan inputs (approved loan amount)
  const [approvedLoanAmount, setApprovedLoanAmount] = useState(1400000)
  const [loanRate, setLoanRate] = useState(6.05)
  const [loanTermYears, setLoanTermYears] = useState(30)

  // Property inputs
  const [propertyValue, setPropertyValue] = useState(1400000)
  const [deposit, setDeposit] = useState(150000)

  // Calculate actual loan amount (what you're borrowing based on property and deposit)
  const actualLoanAmount = propertyValue - deposit

  // Currency formatter for AUD
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Calculate monthly repayment
  const monthlyRepayment = useMemo(() => {
    const principal = approvedLoanAmount
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
  }, [approvedLoanAmount, loanRate, loanTermYears])

  // Calculate total repayments and overpayment
  const repaymentSummary = useMemo(() => {
    const totalPayments = monthlyRepayment * loanTermYears * 12
    const totalInterest = totalPayments - actualLoanAmount
    return { totalPayments, totalInterest }
  }, [monthlyRepayment, loanTermYears, actualLoanAmount])

  // Calculate LVR using approved loan amount
  const lvr = useMemo(() => {
    return (actualLoanAmount / propertyValue) * 100
  }, [actualLoanAmount, propertyValue])

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
              <label htmlFor="loan-term">Loan Term (Years)</label>
              <input
                id="loan-term"
                type="number"
                value={loanTermYears}
                onChange={(e) => setLoanTermYears(Number(e.target.value))}
                placeholder="Enter loan term"
              />
            </div>
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
              <label htmlFor="deposit">Deposit</label>
              <input
                id="deposit"
                type="number"
                value={deposit}
                onChange={(e) => setDeposit(Number(e.target.value))}
                placeholder="Enter deposit amount"
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
            <span className="label">Total Repayments:</span>
            <span className="value">{formatCurrency(repaymentSummary.totalPayments)}</span>
          </div>
          <div className="result-item">
            <span className="label">Total Interest (Overpayment):</span>
            <span className="value">{formatCurrency(repaymentSummary.totalInterest)}</span>
          </div>
          <div className="result-item">
            <span className="label">Loan-to-Value Ratio (LVR):</span>
            <span className="value">{lvr.toFixed(2)}%</span>
          </div>
          <div className="result-item">
            <span className="label">Equity Available:</span>
            <span className="value">{formatCurrency(propertyValue - actualLoanAmount)}</span>
          </div>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </div>
  )
}

export default App
