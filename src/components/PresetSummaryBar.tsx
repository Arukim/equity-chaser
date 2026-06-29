const fmt = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n)

interface PresetSummaryBarProps {
  monthlyOngoing: number
  oneOffTotal: number
}

export function PresetSummaryBar({ monthlyOngoing, oneOffTotal }: PresetSummaryBarProps) {
  return (
    <div className="preset-summary-bar">
      <div className="preset-summary-bar__item">
        <span className="preset-summary-bar__label">Monthly ongoing</span>
        <span className="preset-summary-bar__value">{fmt(monthlyOngoing)}<span className="preset-summary-bar__unit">/mo</span></span>
      </div>
      <div className="preset-summary-bar__divider" />
      <div className="preset-summary-bar__item">
        <span className="preset-summary-bar__label">One-off costs</span>
        <span className="preset-summary-bar__value">{fmt(oneOffTotal)}</span>
      </div>
    </div>
  )
}
