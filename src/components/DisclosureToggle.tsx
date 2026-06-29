import { useState } from 'react'

interface DisclosureToggleProps {
  toggleLabel: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export function DisclosureToggle({ toggleLabel, defaultOpen = false, children }: DisclosureToggleProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="disclosure">
      <button
        type="button"
        className={`disclosure__trigger${open ? ' disclosure__trigger--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{toggleLabel}</span>
        <span className="disclosure__chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="disclosure__content">{children}</div>}
    </div>
  )
}
