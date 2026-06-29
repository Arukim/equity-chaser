import type { SpendingItem } from '../../logic/types'

interface CheckboxGridProps {
  items: SpendingItem[]
  enabledIds: string[]
  onToggle: (id: string, linked?: string) => void
  onExecutionMonthChange?: (id: string, month: number) => void
}

export function CheckboxGrid({
  items, enabledIds, onToggle, onExecutionMonthChange,
}: CheckboxGridProps) {
  if (items.length === 0) return null
  return (
    <div className="checkbox-grid">
      {items.map((item) => {
        const enabled = enabledIds.includes(item.id)
        return (
          <div key={item.id} className={`checkbox-item${enabled ? ' checkbox-item--enabled' : ''}`}>
            <label className="checkbox-item__label">
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => onToggle(item.id, item.linkedItemId)}
              />
              <span className="checkbox-item__name">{item.label}</span>
              <span className="checkbox-item__cost">
                {item.frequency === 'once'
                  ? `$${(item.amount / 1000).toFixed(0)}k once`
                  : item.frequency === 'monthly'
                    ? `$${item.amount}/mo`
                    : `$${(item.amount / 1000).toFixed(1)}k/yr`}
              </span>
            </label>
            {enabled && item.frequency === 'once' && onExecutionMonthChange && (
              <div className="checkbox-item__month">
                <span>Month:</span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={item.executionMonth}
                  onChange={(e) => onExecutionMonthChange(item.id, Number(e.target.value))}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
