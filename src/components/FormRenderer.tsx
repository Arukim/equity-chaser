import type { SectionConfig, FieldConfig, ScenarioInputs, OptionEntry, SpendingItem } from '../logic/types'
import { CONFIG_REGISTRY } from '../logic/uiConfig'
import { ChipGroup } from './controls/ChipGroup'
import { CheckboxGrid } from './controls/CheckboxGrid'
import { CurrencyInput, PercentInput, NumberInput } from './controls/NumberInput'
import { ToggleSwitch } from './controls/ToggleSwitch'
import { DisclosureToggle } from './DisclosureToggle'

interface FormRendererProps {
  sections: SectionConfig[]
  values: ScenarioInputs
  onChange: <K extends keyof ScenarioInputs>(key: K, value: ScenarioInputs[K]) => void
  onToggleSpending: (id: string, linkedId?: string) => void
  onExecutionMonthChange: (id: string, month: number) => void
  allSpendings: SpendingItem[]
}

function renderField(
  field: FieldConfig,
  values: ScenarioInputs,
  onChange: FormRendererProps['onChange'],
  onToggleSpending: FormRendererProps['onToggleSpending'],
  onExecutionMonthChange: FormRendererProps['onExecutionMonthChange'],
  allSpendings: SpendingItem[],
) {
  const fieldId = `field-${field.id}-${field.optionsKey ?? ''}`

  switch (field.control) {
    case 'chip-group': {
      const options = (CONFIG_REGISTRY[field.optionsKey ?? ''] ?? []) as OptionEntry[]
      return (
        <div key={fieldId} className="input-group">
          <label>{field.label}</label>
          <ChipGroup
            options={options}
            value={String(values[field.id] ?? '')}
            onChange={(v) => onChange(field.id, v as ScenarioInputs[typeof field.id])}
          />
        </div>
      )
    }

    case 'checkbox-grid': {
      const catalogue = (CONFIG_REGISTRY[field.optionsKey ?? ''] ?? []) as SpendingItem[]
      const catalogueIds = new Set(catalogue.map((i) => i.id))
      const enriched = catalogue.map((item) => {
        const live = allSpendings.find((s) => s.id === item.id)
        return live ? { ...item, executionMonth: live.executionMonth } : item
      })
      return (
        <div key={fieldId}>
          {field.label && <p className="checkbox-grid__label">{field.label}</p>}
          <CheckboxGrid
            items={enriched}
            enabledIds={(values.enabledSpendingIds ?? []).filter((id) => catalogueIds.has(id))}
            onToggle={onToggleSpending}
            onExecutionMonthChange={onExecutionMonthChange}
          />
        </div>
      )
    }

    case 'currency':
      return (
        <CurrencyInput
          key={fieldId}
          id={fieldId}
          label={field.label}
          value={Number(values[field.id] ?? 0)}
          onChange={(v) => onChange(field.id, v as ScenarioInputs[typeof field.id])}
        />
      )

    case 'percent': {
      // minLvr and depositRequired are stored as fractions (0.95), display as %
      const isFraction = field.id === 'minLvr' || field.id === 'depositRequired'
      const displayVal = isFraction ? Number(values[field.id]) * 100 : Number(values[field.id])
      return (
        <PercentInput
          key={fieldId}
          id={fieldId}
          label={field.label}
          value={displayVal}
          step={field.step}
          min={field.min}
          max={field.max}
          onChange={(v) => {
            const stored = isFraction ? v / 100 : v
            onChange(field.id, stored as ScenarioInputs[typeof field.id])
          }}
        />
      )
    }

    case 'number':
      return (
        <NumberInput
          key={fieldId}
          id={fieldId}
          label={field.label}
          value={Number(values[field.id] ?? 0)}
          step={field.step}
          min={field.min}
          max={field.max}
          onChange={(v) => onChange(field.id, v as ScenarioInputs[typeof field.id])}
        />
      )

    case 'toggle':
      return (
        <ToggleSwitch
          key={fieldId}
          id={fieldId}
          label={field.label}
          value={Boolean(values[field.id])}
          onChange={(v) => onChange(field.id, v as ScenarioInputs[typeof field.id])}
        />
      )

    default:
      return null
  }
}

function SectionCard({ section, values, onChange, onToggleSpending, onExecutionMonthChange, allSpendings }: {
  section: SectionConfig
  values: ScenarioInputs
  onChange: FormRendererProps['onChange']
  onToggleSpending: FormRendererProps['onToggleSpending']
  onExecutionMonthChange: FormRendererProps['onExecutionMonthChange']
  allSpendings: SpendingItem[]
}) {
  const fields = section.fields.map((f) =>
    renderField(f, values, onChange, onToggleSpending, onExecutionMonthChange, allSpendings)
  )

  const content = (
    <div className="form-section__fields">
      {fields}
    </div>
  )

  return (
    <div className="form-section">
      <h3 className="form-section__title">{section.title}</h3>
      {section.disclosure ? (
        <DisclosureToggle
          toggleLabel={section.disclosure.toggleLabel}
          defaultOpen={section.disclosure.defaultOpen}
        >
          {content}
        </DisclosureToggle>
      ) : content}
    </div>
  )
}

export function FormRenderer({ sections, values, onChange, onToggleSpending, onExecutionMonthChange, allSpendings }: FormRendererProps) {
  return (
    <div className="form-renderer">
      {sections.map((section) => (
        <SectionCard
          key={section.id}
          section={section}
          values={values}
          onChange={onChange}
          onToggleSpending={onToggleSpending}
          onExecutionMonthChange={onExecutionMonthChange}
          allSpendings={allSpendings}
        />
      ))}
    </div>
  )
}
