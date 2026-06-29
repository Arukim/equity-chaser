interface Option { id: string; label: string }

interface ChipGroupProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
}

export function ChipGroup({ options, value, onChange }: ChipGroupProps) {
  return (
    <div className="chip-group">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={`chip${value === opt.id ? ' chip--active' : ''}`}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
