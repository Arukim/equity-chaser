import { useState } from 'react'
import type { EquityForecast, FinancialHealthWarning } from '../logic/types'
import { CashflowTab } from './tabs/CashflowTab'
import { EquityTab } from './tabs/EquityTab'

type TabId = 'cashflow' | 'equity'

interface ResultsMonitorProps {
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
  forecast: EquityForecast
  monthlyOngoingBase: number
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'cashflow', label: 'Cashflow & Loan' },
  { id: 'equity',   label: 'Equity & Future' },
]

export function ResultsMonitor(props: ResultsMonitorProps) {
  const [activeTab, setActiveTab] = useState<TabId>('cashflow')
  const dangerCount = props.warnings.filter((w) => w.severity === 'danger').length
  const warningCount = props.warnings.filter((w) => w.severity === 'warning').length

  return (
    <div className="results-monitor">
      <div className="results-monitor__header">
        <h2 className="results-monitor__title">Live Results</h2>
        {(dangerCount > 0 || warningCount > 0) && (
          <div className="results-monitor__badges">
            {dangerCount > 0 && <span className="badge badge--danger">{dangerCount} danger</span>}
            {warningCount > 0 && <span className="badge badge--warning">{warningCount} warning</span>}
          </div>
        )}
      </div>

      <div className="tab-bar" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={activeTab === tab.id}
            className={`tab-bar__tab${activeTab === tab.id ? ' tab-bar__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-panel">
        {activeTab === 'cashflow' && (
          <CashflowTab
            monthlyRepayment={props.monthlyRepayment}
            offsetBalance={props.offsetBalance}
            stampDuty={props.stampDuty}
            actualLoanAmount={props.actualLoanAmount}
            lvr={props.lvr}
            usableEquityNow={props.usableEquityNow}
            repaymentMonths={props.repaymentMonths}
            totalInterest={props.totalInterest}
            totalPayments={props.totalPayments}
            warnings={props.warnings}
          />
        )}
        {activeTab === 'equity' && (
          <EquityTab
            forecast={props.forecast}
            monthlyOngoingBase={props.monthlyOngoingBase}
          />
        )}
      </div>
    </div>
  )
}
