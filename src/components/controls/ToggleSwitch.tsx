interface ToggleSwitchProps {
  id: string
  label: string
  value: boolean
  onChange: (value: boolean) => void
}

export function ToggleSwitch({ id, label, value, onChange }: ToggleSwitchProps) {
  return (
    <div className="input-group input-group--toggle">
      <label htmlFor={id}>{label}</label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={value}
        className={`toggle-switch${value ? ' toggle-switch--on' : ''}`}
        onClick={() => onChange(!value)}
      >
        <span className="toggle-switch__thumb" />
        <span className="toggle-switch__label">{value ? 'Yes' : 'No'}</span>
      </button>
    </div>
  )
}
