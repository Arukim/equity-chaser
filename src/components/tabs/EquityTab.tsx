import type { EquityForecast, EquitySnapshot } from '../../logic/types'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n)

interface EquityTabProps {
  forecast: EquityForecast
  monthlyOngoingBase: number
}

function SnapshotColumn({ snap, grade }: { snap: EquitySnapshot; grade: string }) {
  const isMid = grade === 'mid'
  return (
    <div className={`equity-col${isMid ? ' equity-col--mid' : ''}`}>
      <div className="equity-row">
        <span className="equity-row__label">Property Value</span>
        <span className="equity-row__value">{fmt(snap.propertyValue)}</span>
      </div>
      <div className="equity-row">
        <span className="equity-row__label">Loan Balance</span>
        <span className="equity-row__value">{fmt(snap.loanBalance)}</span>
      </div>
      <div className="equity-row equity-row--highlight">
        <span className="equity-row__label">Gross Equity</span>
        <span className="equity-row__value">{fmt(snap.grossEquity)}</span>
      </div>
      <div className="equity-row">
        <span className="equity-row__label">
          Usable Equity <span className="hint" title="(Property × 80%) − Loan. Actual borrowable funds.">ⓘ</span>
        </span>
        <span className={`equity-row__value${snap.usableEquity < 0 ? ' equity-row__value--danger' : ' equity-row__value--accent'}`}>
          {fmt(snap.usableEquity)}
        </span>
      </div>
      <div className="equity-row">
        <span className="equity-row__label">
          Available Cash <span className="hint" title="Cash sitting in your offset account at this point.">ⓘ</span>
        </span>
        <span className={`equity-row__value${snap.offsetBalance < 0 ? ' equity-row__value--danger' : ' equity-row__value--accent'}`}>
          {fmt(snap.offsetBalance)}
        </span>
      </div>
      <div className="equity-row equity-row--muted">
        <span className="equity-row__label">Costs Incurred</span>
        <span className="equity-row__value">−{fmt(snap.totalCostsIncurred)}</span>
      </div>
      <div className="equity-row equity-row--total">
        <span className="equity-row__label">Net Equity</span>
        <span className="equity-row__value">{fmt(snap.netEquityAfterCosts)}</span>
      </div>
    </div>
  )
}

export function EquityTab({ forecast, monthlyOngoingBase }: EquityTabProps) {
  const grades = [
    { key: 'low' as const,  label: 'Low' },
    { key: 'mid' as const,  label: 'Mid' },
    { key: 'high' as const, label: 'High' },
  ]

  return (
    <div className="tab-content equity-tab">
      <div className="equity-tab__ongoing">
        Monthly ongoing costs (base): <strong>{fmt(monthlyOngoingBase)}/mo</strong>
        <span className="hint" title="CPI-adjusted in projection"> + CPI</span>
      </div>

      {(['year5', 'year10'] as const).map((period) => (
        <div key={period} className="equity-period">
          <h4 className="equity-period__title">{period === 'year5' ? '5 Years' : '10 Years'}</h4>
          <div className="equity-header-row">
            {grades.map(({ key, label }) => (
              <div key={key} className={`equity-col-header${key === 'mid' ? ' equity-col-header--mid' : ''}`}>
                {label} ({forecast[key].growthRate.toFixed(1)}%/yr)
              </div>
            ))}
          </div>
          <div className="equity-grid">
            {grades.map(({ key }) => (
              <SnapshotColumn key={key} snap={forecast[key][period]} grade={key} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
