interface NumberInputProps {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
  suffix?: string
}

export function NumberInput({ id, label, value, onChange, step = 1, min, max, suffix }: NumberInputProps) {
  return (
    <div className="input-group">
      <label htmlFor={id}>{label}{suffix ? ` (${suffix})` : ''}</label>
      <input
        id={id}
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

export function CurrencyInput({ id, label, value, onChange }: Omit<NumberInputProps, 'step' | 'suffix'>) {
  return (
    <div className="input-group">
      <label htmlFor={id}>{label}</label>
      <div className="input-prefix-wrap">
        <span className="input-prefix">$</span>
        <input
          id={id}
          type="number"
          value={value}
          step={1000}
          min={0}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </div>
  )
}

export function PercentInput({ id, label, value, onChange, step = 0.1, min = 0, max = 100 }: NumberInputProps) {
  return (
    <div className="input-group">
      <label htmlFor={id}>{label}</label>
      <div className="input-prefix-wrap">
        <input
          id={id}
          type="number"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="input-suffix">%</span>
      </div>
    </div>
  )
}
