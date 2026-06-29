import type { SavedScenario } from '../../logic/types'

interface ScenarioSelectorProps {
  /** All saved scenarios available for selection. */
  allScenarios: SavedScenario[]
  /** The ids of currently selected scenarios (max 4). */
  selectedIds: string[]
  /** Called when the user toggles a scenario chip. */
  onToggle: (id: string) => void
}

const MAX_SELECTIONS = 4

export function ScenarioSelector({
  allScenarios,
  selectedIds,
  onToggle,
}: ScenarioSelectorProps) {
  const atMax = selectedIds.length >= MAX_SELECTIONS

  if (allScenarios.length === 0) {
    return (
      <div className="scenario-selector">
        <div className="scenario-selector__empty">
          <span className="scenario-selector__empty-icon">💾</span>
          <p>No saved scenarios yet.</p>
          <p>
            Go to the <strong>Dashboard</strong>, configure a property, then save it
            using the <em>Scenarios</em> menu in the toolbar.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="scenario-selector">
      <div className="scenario-selector__meta">
        <span className="scenario-selector__count">
          {selectedIds.length} / {MAX_SELECTIONS} selected
        </span>
        {atMax && (
          <span className="scenario-selector__limit-badge">
            Max reached — deselect one to swap
          </span>
        )}
      </div>

      <div className="scenario-selector__chips">
        {allScenarios.map((scenario) => {
          const isSelected = selectedIds.includes(scenario.id)
          const isDisabled = atMax && !isSelected

          return (
            <button
              key={scenario.id}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              aria-label={`${isSelected ? 'Deselect' : 'Select'} scenario "${scenario.name}"`}
              disabled={isDisabled}
              className={[
                'scenario-selector__chip',
                isSelected ? 'scenario-selector__chip--active' : '',
                isDisabled ? 'scenario-selector__chip--disabled' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onToggle(scenario.id)}
            >
              <span className="scenario-selector__chip-name">{scenario.name}</span>
              <span className="scenario-selector__chip-date">
                {new Date(scenario.createdAt).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              {isSelected && (
                <span className="scenario-selector__chip-check" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
