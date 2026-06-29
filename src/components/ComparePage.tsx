import { useState, useMemo } from 'react'
import type { SavedScenario } from '../logic/types'
import { loadAllScenarios } from '../logic/ScenarioStorage'
import { computeScenarioComparison } from '../logic/ScenarioComparison'
import type { ComputedScenarioMetrics } from '../logic/ScenarioComparison'
import { ScenarioSelector } from './compare/ScenarioSelector'
import { ComparisonMatrix } from './compare/ComparisonMatrix'
import { ComparisonCharts } from './compare/ComparisonCharts'

const MAX_SELECTIONS = 4

export function ComparePage() {
  // Load all saved scenarios once on mount — the user may have navigated here
  // after saving new ones, so we read fresh on every component mount.
  const [allScenarios] = useState<SavedScenario[]>(() => loadAllScenarios())
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  function handleToggle(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_SELECTIONS) return prev   // guard: should be disabled in UI
      return [...prev, id]
    })
  }

  // Keep selected scenarios in the stable insertion order of `allScenarios`
  // so that column order is deterministic and matches the chip order.
  const selectedScenarios = useMemo(
    () => allScenarios.filter((s) => selectedIds.includes(s.id)),
    [allScenarios, selectedIds],
  )

  // Memoised per-scenario computation — only re-runs when selection changes.
  const metricsMap = useMemo<Map<string, ComputedScenarioMetrics>>(() => {
    const map = new Map<string, ComputedScenarioMetrics>()
    for (const s of selectedScenarios) {
      map.set(s.id, computeScenarioComparison(s.inputs))
    }
    return map
  }, [selectedScenarios])

  return (
    <div className="compare-page">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="compare-page__hero">
        <h2 className="compare-page__title">⚖️ Compare Scenarios</h2>
        <p className="compare-page__description">
          Select up to {MAX_SELECTIONS} saved scenarios to evaluate wealth creation versus
          capital burn over a 10-year horizon.
        </p>
      </div>

      {/* ── Section 1: Scenario Selector ─────────────────────────────────── */}
      <section className="compare-page__section" aria-label="Scenario selector">
        <h3 className="compare-page__section-title">
          <span className="compare-page__section-icon" aria-hidden="true">📋</span>
          Choose Scenarios
        </h3>
        <ScenarioSelector
          allScenarios={allScenarios}
          selectedIds={selectedIds}
          onToggle={handleToggle}
        />
      </section>

      {/* ── Section 2: Comparison Matrix ─────────────────────────────────── */}
      <section className="compare-page__section" aria-label="Comparison matrix">
        <h3 className="compare-page__section-title">
          <span className="compare-page__section-icon" aria-hidden="true">🔍</span>
          The Truth Matrix
          {selectedScenarios.length > 0 && (
            <span className="compare-page__section-badge">
              {selectedScenarios.length} scenario{selectedScenarios.length > 1 ? 's' : ''}
            </span>
          )}
        </h3>
        <ComparisonMatrix
          scenarios={selectedScenarios}
          metricsMap={metricsMap}
        />
      </section>

      {/* ── Section 3: Visualisations ────────────────────────────────────── */}
      <section className="compare-page__section" aria-label="Visualisations">
        <h3 className="compare-page__section-title">
          <span className="compare-page__section-icon" aria-hidden="true">📊</span>
          Visualisations
        </h3>
        <ComparisonCharts
          scenarios={selectedScenarios}
          metricsMap={metricsMap}
        />
      </section>
    </div>
  )
}
