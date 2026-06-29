import type React from 'react'
import type { SavedScenario } from '../../logic/types'
import type { ComputedScenarioMetrics } from '../../logic/ScenarioComparison'
import type { MetricFormat } from '../../logic/comparisonConfig'
import {
  COMPARISON_GROUPS,
  COMPARISON_METRICS_CONFIG,
  pickWinnerIndex,
} from '../../logic/comparisonConfig'

// ─── Formatting helpers ───────────────────────────────────────────────────────

const fmtCurrency = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0,
})

function formatValue(value: number, format: MetricFormat, negativeDisplay?: boolean): string {
  let formatted: string
  switch (format) {
    case 'currency':
      formatted = fmtCurrency.format(Math.abs(value))
      break
    case 'months':
      formatted = value === 0 ? 'None' : `${value} mo`
      break
    case 'percent':
      formatted = `${value.toFixed(1)}%`
      break
    default:
      formatted = value.toLocaleString('en-AU', { maximumFractionDigits: 1 })
  }
  return negativeDisplay && value !== 0 ? `−${formatted}` : formatted
}

// One accent colour per scenario column — wraps if > 4 (enforced by selector).
const SCENARIO_COLOURS = ['#c084fc', '#34d399', '#60a5fa', '#fb923c'] as const

// ─── Props ────────────────────────────────────────────────────────────────────

interface ComparisonMatrixProps {
  scenarios: SavedScenario[]
  metricsMap: Map<string, ComputedScenarioMetrics>
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ComparisonMatrix({ scenarios, metricsMap }: ComparisonMatrixProps) {
  if (scenarios.length === 0) {
    return (
      <div className="comparison-matrix comparison-matrix--empty">
        <p>Select at least one scenario above to see the comparison matrix.</p>
      </div>
    )
  }

  const colStyle = { '--col-count': scenarios.length } as React.CSSProperties

  return (
    <div className="comparison-matrix" role="table" aria-label="Scenario comparison matrix" style={colStyle}>
      {/* Sticky header row */}
      <div className="comparison-matrix__header" role="row">
        <div className="comparison-matrix__row-label" role="columnheader">Metric</div>
        {scenarios.map((s, idx) => (
          <div key={s.id} role="columnheader" className="comparison-matrix__col-header"
            style={{ borderBottomColor: SCENARIO_COLOURS[idx % SCENARIO_COLOURS.length] }}>
            <span className="comparison-matrix__col-swatch"
              style={{ background: SCENARIO_COLOURS[idx % SCENARIO_COLOURS.length] }}
              aria-hidden="true" />
            <span className="comparison-matrix__col-name">{s.name}</span>
            <span className="comparison-matrix__col-date">
              {new Date(s.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        ))}
      </div>

      {/* Groups + rows — driven entirely by COMPARISON_GROUPS + COMPARISON_METRICS_CONFIG */}
      {COMPARISON_GROUPS.map((group) => {
        const groupMetrics = COMPARISON_METRICS_CONFIG.filter((m) => m.group === group.id)
        return (
          <div key={group.id} className="comparison-matrix__group" role="rowgroup">
            <div className="comparison-matrix__group-header" role="row">
              <div className="comparison-matrix__group-label" role="cell">
                <span className="comparison-matrix__group-icon" aria-hidden="true">{group.icon}</span>
                <div>
                  <span className="comparison-matrix__group-name">{group.label}</span>
                  <span className="comparison-matrix__group-desc">{group.description}</span>
                </div>
              </div>
              {scenarios.map((s) => (
                <div key={s.id} className="comparison-matrix__group-filler" role="cell" aria-hidden="true" />
              ))}
            </div>

            {groupMetrics.map((metric) => {
              const values = scenarios.map((s) => {
                const m = metricsMap.get(s.id)
                return m ? metric.extract(m) : NaN
              })
              const winnerIdx = pickWinnerIndex(values, metric.isHigherBetter)

              return (
                <div key={metric.id} className="comparison-matrix__row" role="row">
                  <div className="comparison-matrix__row-label" role="rowheader">
                    <span>{metric.label}</span>
                    {metric.hint && (
                      <span className="hint" title={metric.hint} aria-label={metric.hint}>ⓘ</span>
                    )}
                  </div>
                  {values.map((value, idx) => {
                    const isWinner = idx === winnerIdx
                    const isNegativeRaw = !metric.negativeDisplay && Number.isFinite(value) && value < 0
                    return (
                      <div key={scenarios[idx].id} role="cell"
                        className={[
                          'comparison-matrix__cell',
                          isWinner ? 'comparison-matrix__cell--winner' : '',
                          isNegativeRaw ? 'comparison-matrix__cell--negative' : '',
                        ].filter(Boolean).join(' ')}
                        aria-label={isWinner
                          ? `${scenarios[idx].name}: ${formatValue(value, metric.format, metric.negativeDisplay)} (best)`
                          : undefined}>
                        {Number.isFinite(value)
                          ? formatValue(value, metric.format, metric.negativeDisplay)
                          : '—'}
                        {isWinner && (
                          <span className="comparison-matrix__cell-win-badge" aria-hidden="true">★</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
