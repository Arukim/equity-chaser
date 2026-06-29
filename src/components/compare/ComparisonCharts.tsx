import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts'
import type { SavedScenario } from '../../logic/types'
import type { ComputedScenarioMetrics } from '../../logic/ScenarioComparison'
import { COMPARISON_SIMULATION_MONTHS } from '../../logic/ScenarioComparison'

const SCENARIO_COLOURS = ['#c084fc', '#34d399', '#60a5fa', '#fb923c'] as const

const fmtCompact = new Intl.NumberFormat('en-AU', {
  style: 'currency', currency: 'AUD', notation: 'compact', maximumFractionDigits: 0,
})
const fmtFull = new Intl.NumberFormat('en-AU', {
  style: 'currency', currency: 'AUD', maximumFractionDigits: 0,
})

function fmtYAxis(value: number) { return fmtCompact.format(value) }
function monthToYearLabel(month: number) {
  return month % 12 === 0 ? `Yr ${month / 12}` : ''
}

// ─── Custom tooltip shared by both charts ─────────────────────────────────────

interface TooltipEntry { name: string; value: number; color: string }
interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: number | string
  labelPrefix?: string
}
function CustomTooltip({ active, payload, label, labelPrefix }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="compare-chart__tooltip">
      <p className="compare-chart__tooltip-label">{labelPrefix ?? ''}{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="compare-chart__tooltip-row">
          <span className="compare-chart__tooltip-name">{entry.name}:</span>
          <span className="compare-chart__tooltip-value">{fmtFull.format(entry.value)}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Data builders ────────────────────────────────────────────────────────────

function buildOffsetData(
  scenarios: SavedScenario[],
  metricsMap: Map<string, ComputedScenarioMetrics>,
): Record<string, number>[] {
  return Array.from({ length: COMPARISON_SIMULATION_MONTHS }, (_, i) => {
    const row: Record<string, number> = { month: i + 1 }
    for (const s of scenarios) {
      const m = metricsMap.get(s.id)
      if (m) row[s.name] = m.offsetTrajectory[i]
    }
    return row
  })
}

function buildTotalEquityData(
  scenarios: SavedScenario[],
  metricsMap: Map<string, ComputedScenarioMetrics>,
): Record<string, number>[] {
  return Array.from({ length: COMPARISON_SIMULATION_MONTHS }, (_, i) => {
    const row: Record<string, number> = { month: i + 1 }
    for (const s of scenarios) {
      const m = metricsMap.get(s.id)
      if (m) row[s.name] = m.totalEquityTrajectory[i]
    }
    return row
  })
}

function buildSunkCostsData(
  scenarios: SavedScenario[],
  metricsMap: Map<string, ComputedScenarioMetrics>,
): { name: string; interest: number; holding: number }[] {
  return scenarios.map((s) => {
    const m = metricsMap.get(s.id)
    return { name: s.name, interest: m?.totalInterestPaid ?? 0, holding: m?.totalHoldingCosts ?? 0 }
  })
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ComparisonChartsProps {
  scenarios: SavedScenario[]
  metricsMap: Map<string, ComputedScenarioMetrics>
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ComparisonCharts({ scenarios, metricsMap }: ComparisonChartsProps) {
  if (scenarios.length === 0) {
    return (
      <div className="compare-charts compare-charts--empty">
        <p>Select scenarios above to generate charts.</p>
      </div>
    )
  }

  const offsetData = buildOffsetData(scenarios, metricsMap)
  const totalEquityData = buildTotalEquityData(scenarios, metricsMap)
  const sunkData = buildSunkCostsData(scenarios, metricsMap)

  return (
    <div className="compare-charts">
      {/* Chart A: Available Cash (Offset Balance) */}
      <section className="compare-chart" aria-label="Available cash (offset balance) over 10 years">
        <div className="compare-chart__header">
          <h3 className="compare-chart__title">💰 Available Cash</h3>
          <p className="compare-chart__subtitle">
            Month-by-month cash in your offset account over 120 months.
          </p>
        </div>
        <div className="compare-chart__canvas">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={offsetData} margin={{ top: 8, right: 24, bottom: 8, left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
              <XAxis dataKey="month" tickFormatter={monthToYearLabel} interval={11}
                tick={{ fontSize: 11, fill: '#9ca3af' }} stroke="#3a3a48" />
              <YAxis tickFormatter={fmtYAxis} tick={{ fontSize: 11, fill: '#9ca3af' }}
                stroke="#3a3a48" width={72} />
              <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" label={{ value: '$0', fill: '#6b7280', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip labelPrefix="Month " />} />
              <Legend wrapperStyle={{ fontSize: '0.82rem', paddingTop: '8px' }} iconType="circle" />
              {scenarios.map((s, idx) => (
                <Line key={s.id} type="monotone" dataKey={s.name}
                  stroke={SCENARIO_COLOURS[idx % SCENARIO_COLOURS.length]}
                  strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Chart B: Total Equity Trajectory */}
      <section className="compare-chart" aria-label="Total net wealth trajectory over 10 years">
        <div className="compare-chart__header">
          <h3 className="compare-chart__title">🏠 Total Net Wealth Trajectory</h3>
          <p className="compare-chart__subtitle">
            Month-by-month true net wealth (<em>property value − loan balance + offset balance</em>) over 120 months
            using the mid-range growth rate.
          </p>
        </div>
        <div className="compare-chart__canvas">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={totalEquityData} margin={{ top: 8, right: 24, bottom: 8, left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
              <XAxis dataKey="month" tickFormatter={monthToYearLabel} interval={11}
                tick={{ fontSize: 11, fill: '#9ca3af' }} stroke="#3a3a48" />
              <YAxis tickFormatter={fmtYAxis} tick={{ fontSize: 11, fill: '#9ca3af' }}
                stroke="#3a3a48" width={72} />
              <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" label={{ value: '$0', fill: '#6b7280', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip labelPrefix="Month " />} />
              <Legend wrapperStyle={{ fontSize: '0.82rem', paddingTop: '8px' }} iconType="circle" />
              {scenarios.map((s, idx) => (
                <Line key={s.id} type="monotone" dataKey={s.name}
                  stroke={SCENARIO_COLOURS[idx % SCENARIO_COLOURS.length]}
                  strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Chart C: Sunk Costs Breakdown */}
      <section className="compare-chart" aria-label="10-year sunk costs breakdown">
        <div className="compare-chart__header">
          <h3 className="compare-chart__title">🔥 Sunk Costs Breakdown — Year 10</h3>
          <p className="compare-chart__subtitle">
            Cumulative interest paid (offset-adjusted) vs. holding costs (strata, rates,
            maintenance, CPI-adjusted) over the full 10-year simulation.
          </p>
        </div>
        <div className="compare-chart__canvas">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sunkData} margin={{ top: 8, right: 24, bottom: 8, left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} stroke="#3a3a48" />
              <YAxis tickFormatter={fmtYAxis} tick={{ fontSize: 11, fill: '#9ca3af' }}
                stroke="#3a3a48" width={72} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '0.82rem', paddingTop: '8px' }} />
              <Bar dataKey="interest" name="Total Interest Paid" stackId="sunk" fill="#f87171" />
              <Bar dataKey="holding" name="Total Holding Costs" stackId="sunk" fill="#fb923c"
                radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
