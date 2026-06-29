import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import type { SavedScenario, ScenarioInputs } from '../logic/types'
import { saveScenario, loadAllScenarios, deleteScenario, exportAsJSON, importFromJSON } from '../logic/ScenarioStorage'

interface HeaderToolbarProps {
  currentInputs: ScenarioInputs
  onLoad: (inputs: ScenarioInputs) => void
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function HeaderToolbar({ currentInputs, onLoad }: HeaderToolbarProps) {
  const [open, setOpen] = useState(false)
  const [scenarios, setScenarios] = useState<SavedScenario[]>(() => loadAllScenarios())
  const [saveName, setSaveName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function refresh() { setScenarios(loadAllScenarios()) }

  function handleSave() {
    if (!saveName.trim()) return
    const scenario: SavedScenario = {
      schemaVersion: 1,
      id: generateId(),
      name: saveName.trim(),
      createdAt: new Date().toISOString(),
      inputs: currentInputs,
    }
    saveScenario(scenario)
    setSaveName('')
    setShowSaveInput(false)
    refresh()
  }

  function handleDelete(id: string) {
    deleteScenario(id)
    refresh()
  }

  function handleExportAll() {
    const json = exportAsJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'equity-chaser-scenarios.json'; a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const imported = importFromJSON(String(ev.target?.result ?? ''))
        imported.forEach(saveScenario)
        refresh()
      } catch {
        alert('Invalid scenario file — could not import.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <header className="toolbar">
      <div className="toolbar__brand">
        <span className="toolbar__logo">📊</span>
        <h1 className="toolbar__title">Equity Chaser</h1>
      </div>

      <nav className="toolbar__nav" aria-label="Main navigation">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `toolbar__nav-link${isActive ? ' toolbar__nav-link--active' : ''}`
          }
        >
          🏠 Dashboard
        </NavLink>
        <NavLink
          to="/compare"
          className={({ isActive }) =>
            `toolbar__nav-link${isActive ? ' toolbar__nav-link--active' : ''}`
          }
        >
          ⚖️ Compare
        </NavLink>
      </nav>

      <div className="toolbar__actions" ref={menuRef}>
        <button
          type="button"
          className={`toolbar__btn${open ? ' toolbar__btn--active' : ''}`}
          onClick={() => setOpen((v) => !v)}
        >
          💾 Scenarios {scenarios.length > 0 && <span className="toolbar__count">{scenarios.length}</span>}
        </button>

        {open && (
          <div className="scenario-menu">
            <div className="scenario-menu__header">
              {!showSaveInput ? (
                <button type="button" className="scenario-menu__save-btn" onClick={() => setShowSaveInput(true)}>
                  + Save Current
                </button>
              ) : (
                <div className="scenario-menu__save-form">
                  <input
                    autoFocus
                    type="text"
                    placeholder="e.g. Surry Hills 2BR"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSaveInput(false) }}
                  />
                  <button type="button" onClick={handleSave}>Save</button>
                  <button type="button" onClick={() => setShowSaveInput(false)}>✕</button>
                </div>
              )}
            </div>

            <div className="scenario-menu__list">
              {scenarios.length === 0 && <p className="scenario-menu__empty">No saved scenarios yet</p>}
              {scenarios.map((s) => (
                <div key={s.id} className="scenario-item">
                  <div className="scenario-item__info">
                    <span className="scenario-item__name">📍 {s.name}</span>
                    <span className="scenario-item__date">{new Date(s.createdAt).toLocaleDateString('en-AU')}</span>
                  </div>
                  <div className="scenario-item__actions">
                    <button type="button" onClick={() => { onLoad(s.inputs); setOpen(false) }}>Load</button>
                    <button type="button" onClick={() => handleDelete(s.id)}>🗑</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="scenario-menu__footer">
              <button type="button" onClick={handleExportAll}>↓ Export All</button>
              <label className="scenario-menu__import-btn">
                ↑ Import JSON
                <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
              </label>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
