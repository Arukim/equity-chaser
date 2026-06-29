import type { FinancialHealthWarning } from '../../logic/types'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n)

interface CashflowTabProps {
  monthlyRepayment: number
  offsetBalance: number
  stampDuty: number
  actualLoanAmount: number
  lvr: number
  usableEquityNow: number
  repaymentMonths: number
  totalInterest: number
  totalPayments: number
  warnings: FinancialHealthWarning[]
}

export function CashflowTab({
  monthlyRepayment, offsetBalance, stampDuty, actualLoanAmount,
  lvr, usableEquityNow, repaymentMonths, totalInterest, totalPayments, warnings,
}: CashflowTabProps) {
  return (
    <div className="tab-content">
      <div className="result-item highlight">
        <span className="label">Monthly Repayment</span>
        <span className="value">{fmt(monthlyRepayment)}</span>
      </div>
      <div className="result-item">
        <span className="label">Starting Offset Balance</span>
        <span className={`value${offsetBalance < 0 ? ' value--danger' : ''}`}>{fmt(offsetBalance)}</span>
      </div>
      <div className="result-item">
        <span className="label">Stamp Duty</span>
        <span className="value">{fmt(stampDuty)}</span>
      </div>
      <div className="result-item">
        <span className="label">Actual Loan Amount</span>
        <span className="value">{fmt(actualLoanAmount)}</span>
      </div>
      <div className="result-item">
        <span className="label">LVR</span>
        <span className={`value${lvr > 95 ? ' value--danger' : lvr > 90 ? ' value--warning' : ''}`}>{lvr.toFixed(1)}%</span>
      </div>
      <div className="result-item">
        <span className="label">Usable Equity Now <span className="hint" title="(Property × 80%) − Loan">ⓘ</span></span>
        <span className={`value${usableEquityNow < 0 ? ' value--danger' : ''}`}>{fmt(usableEquityNow)}</span>
      </div>
      <div className="result-item">
        <span className="label">Actual Loan Term</span>
        <span className="value">{(repaymentMonths / 12).toFixed(1)} yrs</span>
      </div>
      <div className="result-item">
        <span className="label">Total Interest</span>
        <span className="value">{fmt(totalInterest)}</span>
      </div>
      <div className="result-item">
        <span className="label">Total Repayments</span>
        <span className="value">{fmt(totalPayments)}</span>
      </div>

      {warnings.length > 0 && (
        <div className="warnings-list">
          {warnings.map((w, i) => (
            <div key={i} className={`warning-banner warning-banner--${w.severity}`}>
              <span className="warning-banner__icon">{w.severity === 'danger' ? '🔴' : '⚠️'}</span>
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
